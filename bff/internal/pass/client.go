package pass

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

type Balance struct {
	AvailableQuota        int64 `json:"available_quota"`
	WarningThresholdQuota int64 `json:"warning_threshold_quota"`
}

type Usage struct {
	Available    bool      `json:"available"`
	Period       string    `json:"period"`
	PeriodStart  time.Time `json:"period_start"`
	PeriodEnd    time.Time `json:"period_end"`
	UsedQuota    int64     `json:"used_quota"`
	RequestCount int64     `json:"request_count"`
}

type Display struct {
	Type                 string  `json:"type"`
	QuotaPerUnit         float64 `json:"quota_per_unit"`
	CurrencySymbol       string  `json:"currency_symbol"`
	CurrencyExchangeRate float64 `json:"currency_exchange_rate"`
}

type Summary struct {
	AccountSubject string    `json:"account_sub"`
	AccountStatus  string    `json:"account_status"`
	Balance        Balance   `json:"balance"`
	Usage          Usage     `json:"usage"`
	Display        Display   `json:"display"`
	Alerts         []string  `json:"alerts"`
	GeneratedAt    time.Time `json:"generated_at"`
}

type Provider interface {
	Summary(context.Context, string, string) (Summary, error)
}

type Client struct {
	baseURL    *url.URL
	machineID  string
	secret     string
	httpClient *http.Client
}

type HTTPError struct{ Status int }

func (e *HTTPError) Error() string { return fmt.Sprintf("Pass endpoint returned status %d", e.Status) }

func New(baseURL *url.URL, machineID, secret string, httpClient *http.Client) (*Client, error) {
	if baseURL == nil || !baseURL.IsAbs() || baseURL.Host == "" || !strings.HasSuffix(baseURL.Path, "/") {
		return nil, errors.New("Pass base URL must be absolute and end with /")
	}
	if machineID == "" || secret == "" {
		return nil, errors.New("Pass machine credentials are required")
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 3 * time.Second}
	}
	copyURL := *baseURL
	return &Client{baseURL: &copyURL, machineID: machineID, secret: secret, httpClient: httpClient}, nil
}

func (c *Client) Summary(ctx context.Context, subject, requestID string) (Summary, error) {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		return Summary{}, errors.New("invalid Pass summary request")
	}
	endpoint := c.baseURL.ResolveReference(&url.URL{Path: "api/internal/openakita/users/" + url.PathEscape(subject) + "/summary"})
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return Summary{}, err
	}
	request.SetBasicAuth(c.machineID, c.secret)
	request.Header.Set("Accept", "application/json")
	if requestID != "" {
		request.Header.Set("X-Request-ID", requestID)
	}
	response, err := c.httpClient.Do(request)
	if err != nil {
		return Summary{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 64<<10))
		return Summary{}, &HTTPError{Status: response.StatusCode}
	}
	var envelope struct {
		Success bool    `json:"success"`
		Data    Summary `json:"data"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&envelope); err != nil || !envelope.Success {
		return Summary{}, errors.New("invalid Pass summary response")
	}
	if err := validateSummary(envelope.Data, subject); err != nil {
		return Summary{}, err
	}
	return envelope.Data, nil
}

func validateSummary(summary Summary, subject string) error {
	if summary.AccountSubject != subject || summary.GeneratedAt.IsZero() {
		return errors.New("inconsistent Pass summary response")
	}
	if summary.AccountStatus != "active" && summary.AccountStatus != "suspended" && summary.AccountStatus != "not_provisioned" {
		return errors.New("invalid Pass account status")
	}
	if summary.Balance.WarningThresholdQuota < 0 || summary.Usage.Period != "month" || summary.Usage.PeriodStart.IsZero() ||
		summary.Usage.PeriodEnd.IsZero() || !summary.Usage.PeriodEnd.After(summary.Usage.PeriodStart) || summary.Usage.UsedQuota < 0 ||
		summary.Usage.RequestCount < 0 || summary.Display.QuotaPerUnit <= 0 || summary.Display.CurrencyExchangeRate <= 0 {
		return errors.New("invalid Pass summary values")
	}
	if summary.Display.Type != "CNY" && summary.Display.Type != "TOKENS" && summary.Display.Type != "CUSTOM" {
		return errors.New("invalid Pass display policy")
	}
	if !utf8.ValidString(summary.Display.CurrencySymbol) || utf8.RuneCountInString(summary.Display.CurrencySymbol) > 8 ||
		strings.IndexFunc(summary.Display.CurrencySymbol, unicode.IsControl) >= 0 {
		return errors.New("invalid Pass currency symbol")
	}
	allowedAlerts := map[string]bool{"account_suspended": true, "balance_depleted": true, "low_balance": true, "usage_unavailable": true}
	seenAlerts := make(map[string]bool, len(summary.Alerts))
	for _, alert := range summary.Alerts {
		if !allowedAlerts[alert] || seenAlerts[alert] {
			return errors.New("invalid Pass alert")
		}
		seenAlerts[alert] = true
	}
	if summary.Usage.Available == seenAlerts["usage_unavailable"] {
		return errors.New("inconsistent Pass usage availability")
	}
	if summary.AccountStatus == "not_provisioned" && (summary.Balance.AvailableQuota != 0 || summary.Usage.Available ||
		summary.Usage.UsedQuota != 0 || summary.Usage.RequestCount != 0 || len(summary.Alerts) != 0) {
		return errors.New("inconsistent unprovisioned Pass summary")
	}
	return nil
}
