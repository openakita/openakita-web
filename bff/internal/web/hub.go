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

type hubResult struct {
	kind         string
	info         oidc.UserInfo
	entitlements oidc.EntitlementView
	marketplace  marketplaceclient.LibrarySummary
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
	if err != nil {
		writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), s.cfg.HubTimeout)
	defer cancel()
	results := make(chan hubResult, 3)
	go func() {
		callCtx, callCancel := context.WithTimeout(ctx, s.cfg.AccountUserInfoTimeout)
		defer callCancel()
		info, callErr := s.idp.UserInfo(callCtx, session.AccessToken)
		results <- hubResult{kind: "account", info: info, err: callErr}
	}()
	go func() {
		callCtx, callCancel := context.WithTimeout(ctx, s.cfg.AccountEntitlementTimeout)
		defer callCancel()
		view, callErr := s.idp.Entitlements(callCtx, session.AccessToken)
		results <- hubResult{kind: "entitlements", entitlements: view, err: callErr}
	}()
	go func() {
		callCtx, callCancel := context.WithTimeout(ctx, s.cfg.MarketplaceTimeout)
		defer callCancel()
		summary, callErr := s.marketplace.LibrarySummary(callCtx, session.Subject, 3, requestID(request.Context()))
		results <- hubResult{kind: "marketplace", marketplace: summary, err: callErr}
	}()

	account := unavailableModule()
	entitlements := unavailableModule()
	marketplace := unavailableModule()
	for range 3 {
		select {
		case result := <-results:
			if result.err != nil {
				if oidc.StatusCode(result.err) == http.StatusUnauthorized {
					_ = s.store.DeleteSession(request.Context(), key)
					s.writeAuthenticationRequired(response)
					return
				}
				if result.kind == "account" && oidc.StatusCode(result.err) == http.StatusForbidden {
					_ = s.store.DeleteSession(request.Context(), key)
					s.clearSessionCookie(response)
					writeError(response, http.StatusForbidden, "account_disabled")
					return
				}
				continue
			}
			if result.kind == "account" {
				if result.info.Subject == "" || result.info.Subject != session.Subject {
					_ = s.store.DeleteSession(request.Context(), key)
					s.writeAuthenticationRequired(response)
					return
				}
				account = moduleEnvelope{Status: "ok", Data: s.mapAccount(result.info)}
			} else if result.kind == "entitlements" {
				entitlements = moduleEnvelope{Status: "ok", Data: summarizeEntitlements(result.entitlements)}
			} else {
				marketplace = moduleEnvelope{Status: "ok", Data: s.mapMarketplace(result.marketplace)}
			}
		case <-ctx.Done():
			writeHubResponse(response, s.now(), account, marketplace, entitlements, s.links())
			return
		}
	}
	writeHubResponse(response, s.now(), account, marketplace, entitlements, s.links())
}

func writeHubResponse(response http.ResponseWriter, now time.Time, account, marketplace, entitlements moduleEnvelope, links publicLinks) {
	writeJSON(response, http.StatusOK, map[string]any{
		"generated_at": now.Format(time.RFC3339),
		"account":      account,
		"marketplace":  marketplace,
		"entitlements": entitlements,
		"links":        links,
	})
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

func (s *Server) mapAccount(info oidc.UserInfo) hubAccount {
	return hubAccount{
		Subject: info.Subject, DisplayName: displayName(info.Name), EmailLabel: maskEmail(info.Email),
		EmailVerified: info.EmailVerified, RequiresEmailBinding: strings.TrimSpace(info.Email) == "" || !info.EmailVerified,
		AvatarURL: s.safeAvatarURL(info.Picture),
	}
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
