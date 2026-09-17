package web

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	marketplaceclient "openakita-web-bff/internal/marketplace"
	"openakita-web-bff/internal/oidc"
	passclient "openakita-web-bff/internal/pass"
)

type moduleError struct {
	Code      string `json:"code"`
	Retryable bool   `json:"retryable"`
}

type moduleEnvelope struct {
	Status string       `json:"status"`
	Data   any          `json:"data,omitempty"`
	Error  *moduleError `json:"error,omitempty"`
}

type hubAccount struct {
	Subject              string `json:"sub"`
	DisplayName          string `json:"display_name"`
	EmailLabel           string `json:"email_label"`
	EmailVerified        bool   `json:"email_verified"`
	RequiresEmailBinding bool   `json:"requires_email_binding"`
	AvatarURL            string `json:"avatar_url,omitempty"`
}

type entitlementProduct struct {
	ProductCode string     `json:"product_code"`
	ActiveCount int        `json:"active_count"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

type hubEntitlements struct {
	ActiveCount int                  `json:"active_count"`
	Products    []entitlementProduct `json:"products"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

type hubMarketplace struct {
	AcquiredCount        int                      `json:"acquired_count"`
	UpdateAvailableCount int                      `json:"update_available_count"`
	Recent               []hubMarketplaceResource `json:"recent"`
}

type hubMarketplaceResource struct {
	ResourceID   string    `json:"resource_id"`
	Slug         string    `json:"slug"`
	Name         string    `json:"name"`
	ResourceType string    `json:"resource_type"`
	IconURL      string    `json:"icon_url,omitempty"`
	AcquiredAt   time.Time `json:"acquired_at"`
	DetailURL    string    `json:"detail_url"`
}

type hubPass struct {
	AccountStatus        string         `json:"account_status"`
	AvailableQuota       int64          `json:"available_quota"`
	WarningThreshold     int64          `json:"warning_threshold_quota"`
	CurrentMonthUsage    int64          `json:"current_month_used_quota"`
	CurrentMonthRequests int64          `json:"current_month_request_count"`
	UsageAvailable       bool           `json:"usage_available"`
	PeriodStart          time.Time      `json:"period_start"`
	PeriodEnd            time.Time      `json:"period_end"`
	Display              hubPassDisplay `json:"display"`
	Alerts               []string       `json:"alerts"`
}

type hubPassDisplay struct {
	Type                 string  `json:"type"`
	QuotaPerUnit         float64 `json:"quota_per_unit"`
	CurrencySymbol       string  `json:"currency_symbol"`
	CurrencyExchangeRate float64 `json:"currency_exchange_rate"`
}

type hubResult struct {
	kind         string
	entitlements oidc.EntitlementView
	marketplace  marketplaceclient.LibrarySummary
	pass         passclient.Summary
	err          error
}

func unavailableModule() moduleEnvelope {
	return moduleEnvelope{Status: "unavailable", Error: &moduleError{Code: "temporarily_unavailable", Retryable: true}}
}

func (s *Server) handleHub(response http.ResponseWriter, request *http.Request) {
	session, key, err := s.sessionForRequest(request.Context(), request)
	if errors.Is(err, errAnonymous) {
		s.writeAuthenticationRequired(response)
		return
	}
	if errors.Is(err, errAccountDisabled) {
		s.clearSessionCookie(response)
		writeError(response, http.StatusForbidden, "account_disabled")
		return
	}
	if err != nil {
		writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), s.cfg.HubTimeout)
	defer cancel()
	results := make(chan hubResult, 3)
	go func() {
		started := time.Now()
		callCtx, callCancel := context.WithTimeout(ctx, s.cfg.AccountEntitlementTimeout)
		defer callCancel()
		view, callErr := s.idp.Entitlements(callCtx, session.AccessToken)
		s.metrics.Downstream("account", "entitlements", downstreamMetricResult(callErr), time.Since(started))
		results <- hubResult{kind: "entitlements", entitlements: view, err: callErr}
	}()
	go func() {
		started := time.Now()
		callCtx, callCancel := context.WithTimeout(ctx, s.cfg.MarketplaceTimeout)
		defer callCancel()
		summary, callErr := s.marketplace.LibrarySummary(callCtx, session.Subject, 3, requestID(request.Context()))
		s.metrics.Downstream("marketplace", "library_summary", downstreamMetricResult(callErr), time.Since(started))
		results <- hubResult{kind: "marketplace", marketplace: summary, err: callErr}
	}()
	go func() {
		started := time.Now()
		callCtx, callCancel := context.WithTimeout(ctx, s.cfg.PassTimeout)
		defer callCancel()
		summary, callErr := s.pass.Summary(callCtx, session.Subject, requestID(request.Context()))
		s.metrics.Downstream("pass", "summary", downstreamMetricResult(callErr), time.Since(started))
		results <- hubResult{kind: "pass", pass: summary, err: callErr}
	}()

	account := moduleEnvelope{Status: "ok", Data: hubAccount{
		Subject: session.Subject, DisplayName: session.DisplayName, EmailLabel: session.EmailLabel,
		EmailVerified: session.EmailVerified, RequiresEmailBinding: session.EmailLabel == "" || !session.EmailVerified,
		AvatarURL: session.AvatarURL,
	}}
	entitlements := unavailableModule()
	marketplace := unavailableModule()
	pass := unavailableModule()
	for range 3 {
		select {
		case result := <-results:
			if result.err != nil {
				if oidc.StatusCode(result.err) == http.StatusUnauthorized {
					_ = s.store.DeleteSession(request.Context(), key)
					s.writeAuthenticationRequired(response)
					return
				}
				continue
			}
			if result.kind == "entitlements" {
				entitlements = moduleEnvelope{Status: "ok", Data: summarizeEntitlements(result.entitlements)}
			} else if result.kind == "marketplace" {
				marketplace = moduleEnvelope{Status: "ok", Data: s.mapMarketplace(result.marketplace)}
			} else {
				pass = moduleEnvelope{Status: "ok", Data: mapPass(result.pass)}
			}
		case <-ctx.Done():
			s.writeHubResponse(response, s.now(), account, marketplace, entitlements, pass, s.links())
			return
		}
	}
	s.writeHubResponse(response, s.now(), account, marketplace, entitlements, pass, s.links())
}

func (s *Server) writeHubResponse(response http.ResponseWriter, now time.Time, account, marketplace, entitlements, pass moduleEnvelope, links publicLinks) {
	for name, module := range map[string]moduleEnvelope{"account": account, "marketplace": marketplace, "entitlements": entitlements, "pass": pass} {
		if module.Status == "unavailable" {
			s.metrics.HubDegraded(name)
		}
	}
	writeJSON(response, http.StatusOK, map[string]any{
		"generated_at": now.Format(time.RFC3339),
		"account":      account,
		"marketplace":  marketplace,
		"entitlements": entitlements,
		"pass":         pass,
		"links":        links,
	})
}

func mapPass(summary passclient.Summary) hubPass {
	alerts := append([]string(nil), summary.Alerts...)
	return hubPass{
		AccountStatus: summary.AccountStatus, AvailableQuota: summary.Balance.AvailableQuota,
		WarningThreshold: summary.Balance.WarningThresholdQuota, CurrentMonthUsage: summary.Usage.UsedQuota,
		CurrentMonthRequests: summary.Usage.RequestCount, UsageAvailable: summary.Usage.Available,
		PeriodStart: summary.Usage.PeriodStart, PeriodEnd: summary.Usage.PeriodEnd,
		Display: hubPassDisplay{Type: summary.Display.Type, QuotaPerUnit: summary.Display.QuotaPerUnit,
			CurrencySymbol: summary.Display.CurrencySymbol, CurrencyExchangeRate: summary.Display.CurrencyExchangeRate},
		Alerts: alerts,
	}
}

func downstreamMetricResult(err error) string {
	if err == nil {
		return "ok"
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return "timeout"
	}
	if status := oidc.StatusCode(err); status == http.StatusUnauthorized || status == http.StatusForbidden {
		return "authentication_error"
	}
	return "error"
}

func (s *Server) mapMarketplace(summary marketplaceclient.LibrarySummary) hubMarketplace {
	result := hubMarketplace{
		AcquiredCount: summary.AcquiredCount, UpdateAvailableCount: summary.UpdateAvailableCount,
		Recent: make([]hubMarketplaceResource, 0, len(summary.Recent)),
	}
	marketplaceOrigin := s.cfg.MarketplaceBaseURL.Scheme + "://" + s.cfg.MarketplaceBaseURL.Host
	for _, item := range summary.Recent {
		iconURL := ""
		if item.IconURL != nil {
			iconURL = s.safeMarketplaceAssetURL(*item.IconURL)
		}
		result.Recent = append(result.Recent, hubMarketplaceResource{
			ResourceID: item.ResourceID, Slug: item.Slug, Name: item.Name, ResourceType: item.ResourceType,
			IconURL: iconURL, AcquiredAt: item.AcquiredAt,
			DetailURL: marketplaceOrigin + "/resources/" + url.PathEscape(item.Slug),
		})
	}
	return result
}

func (s *Server) safeMarketplaceAssetURL(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || !parsed.IsAbs() || parsed.Scheme != "https" || parsed.User != nil {
		return ""
	}
	if !s.cfg.MarketplaceAssetOrigins[parsed.Scheme+"://"+parsed.Host] {
		return ""
	}
	return parsed.String()
}

func summarizeEntitlements(view oidc.EntitlementView) hubEntitlements {
	activeCodes := map[string]struct{}{}
	for _, entitlement := range view.Entitlements {
		if strings.EqualFold(entitlement.Status, "active") && strings.TrimSpace(entitlement.Code) != "" {
			activeCodes[entitlement.Code] = struct{}{}
		}
	}
	products := make([]entitlementProduct, 0, len(view.ProductAccess))
	for _, product := range view.ProductAccess {
		if !strings.EqualFold(product.Status, "enabled") && !strings.EqualFold(product.Status, "active") {
			continue
		}
		codes := map[string]struct{}{}
		for _, code := range product.EntitlementCodes {
			if strings.TrimSpace(code) != "" {
				codes[code] = struct{}{}
			}
		}
		products = append(products, entitlementProduct{ProductCode: product.ProductCode, ActiveCount: len(codes), ExpiresAt: product.ExpiresAt})
	}
	sort.Slice(products, func(i, j int) bool { return products[i].ProductCode < products[j].ProductCode })
	return hubEntitlements{ActiveCount: len(activeCodes), Products: products, UpdatedAt: view.UpdatedAt}
}
