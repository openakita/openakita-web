package web

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"openakita-web-bff/internal/config"
	"openakita-web-bff/internal/cryptobox"
	marketplaceclient "openakita-web-bff/internal/marketplace"
	"openakita-web-bff/internal/oidc"
	passclient "openakita-web-bff/internal/pass"
	"openakita-web-bff/internal/securestore"
)

type fakeProvider struct {
	info             oidc.UserInfo
	infoErr          error
	entitlements     oidc.EntitlementView
	entitlementsErr  error
	refresh          oidc.Tokens
	refreshErr       error
	authorizationURL string
}

type fakeMarketplaceProvider struct {
	summary   marketplaceclient.LibrarySummary
	err       error
	subject   string
	limit     int
	requestID string
}

type fakePassProvider struct {
	summary   passclient.Summary
	err       error
	subject   string
	requestID string
}

func (f *fakePassProvider) Summary(_ context.Context, subject, requestID string) (passclient.Summary, error) {
	f.subject, f.requestID = subject, requestID
	return f.summary, f.err
}

func (f *fakeMarketplaceProvider) LibrarySummary(_ context.Context, subject string, limit int, requestID string) (marketplaceclient.LibrarySummary, error) {
	f.subject, f.limit, f.requestID = subject, limit, requestID
	return f.summary, f.err
}

func (f *fakeProvider) AuthorizationURL(state, nonce, challenge string) string {
	endpoint := f.authorizationURL
	if endpoint == "" {
		endpoint = "https://account.example/oauth/authorize"
	}
	return endpoint + "?state=" + url.QueryEscape(state) + "&nonce=" + url.QueryEscape(nonce) + "&code_challenge=" + url.QueryEscape(challenge) + "&code_challenge_method=S256"
}
func (f *fakeProvider) ExchangeCode(context.Context, string, string, string) (oidc.Tokens, error) {
	return oidc.Tokens{}, errors.New("unused")
}
func (f *fakeProvider) Refresh(context.Context, string, string) (oidc.Tokens, error) {
	return f.refresh, f.refreshErr
}
func (f *fakeProvider) UserInfo(context.Context, string) (oidc.UserInfo, error) {
	return f.info, f.infoErr
}
func (f *fakeProvider) Entitlements(context.Context, string) (oidc.EntitlementView, error) {
	return f.entitlements, f.entitlementsErr
}
func (f *fakeProvider) EndSessionURL(_ string, state string) string {
	return "https://account.example/oauth/end-session?state=" + url.QueryEscape(state)
}

type testRig struct {
	server *Server
	store  *securestore.MemoryStore
	idp    *fakeProvider
	market *fakeMarketplaceProvider
	pass   *fakePassProvider
	clock  time.Time
}

func newTestRig(t *testing.T) *testRig {
	t.Helper()
	publicURL, _ := url.Parse("https://www.example")
	issuer, _ := url.Parse("https://account.example")
	marketplace, _ := url.Parse("https://marketplace.example/")
	passURL, _ := url.Parse("https://pass.example/")
	cfg := config.Config{
		Environment: "production", PublicURL: publicURL, AccountIssuer: issuer, MarketplaceBaseURL: marketplace,
		PassBaseURL: passURL, PassPublicURL: passURL,
		AccountRedirectURI: "https://www.example/auth/callback", AccountPostLogoutURI: "https://www.example/auth/logout/callback",
		SessionTTL: 24 * time.Hour, CookieSecure: true, CookieName: "__Host-oa_web_session",
		AccountUserInfoTimeout: time.Second, AccountEntitlementTimeout: time.Second, HubTimeout: 1500 * time.Millisecond,
		MarketplaceTimeout: time.Second, PassTimeout: time.Second,
		AvatarAllowedOrigins:    map[string]bool{"https://account.example": true},
		MarketplaceAssetOrigins: map[string]bool{"https://marketplace.example": true},
	}
	key := base64.RawURLEncoding.EncodeToString(make([]byte, 32))
	box, err := cryptobox.Parse("test:" + key)
	if err != nil {
		t.Fatal(err)
	}
	store := securestore.NewMemory()
	idp := &fakeProvider{}
	market := &fakeMarketplaceProvider{}
	pass := &fakePassProvider{summary: passclient.Summary{
		AccountSubject: "usr_123", AccountStatus: "not_provisioned",
		Usage:   passclient.Usage{Period: "month", PeriodStart: time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC), PeriodEnd: time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)},
		Display: passclient.Display{Type: "CNY", QuotaPerUnit: 1_000_000, CurrencySymbol: "¥", CurrencyExchangeRate: 1},
		Alerts:  []string{}, GeneratedAt: time.Date(2026, 8, 17, 8, 0, 0, 0, time.UTC),
	}}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	server, err := New(cfg, store, box, idp, market, pass, []byte("<!doctype html><title>account</title>"), logger)
	if err != nil {
		t.Fatal(err)
	}
	clock := time.Date(2026, 8, 17, 8, 0, 0, 0, time.UTC)
	server.now = func() time.Time { return clock }
	return &testRig{server: server, store: store, idp: idp, market: market, pass: pass, clock: clock}
}

func (r *testRig) authenticate(t *testing.T, expires time.Time) *http.Cookie {
	t.Helper()
	raw := "test-browser-session-token"
	session := &webSession{
		Subject: "usr_123", DisplayName: "Akita User", EmailLabel: "a***@example.com", EmailVerified: true,
		AccessToken: "access-secret", RefreshToken: "refresh-secret", IDToken: "id-secret",
		AccessExpires: expires, CreatedAt: r.clock, LastSeenAt: r.clock, ExpiresAt: r.clock.Add(24 * time.Hour), CSRFToken: "csrf-secret",
	}
	if err := r.server.putSession(context.Background(), digest(raw), session); err != nil {
		t.Fatal(err)
	}
	return &http.Cookie{Name: r.server.cfg.CookieName, Value: raw}
}

func doRequest(handler http.Handler, method, target string, cookie *http.Cookie) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, target, nil)
	if cookie != nil {
		request.AddCookie(cookie)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func decodeBody(t *testing.T, response *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var value map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &value); err != nil {
		t.Fatalf("invalid JSON %q: %v", response.Body.String(), err)
	}
	return value
}

func TestSessionAnonymousAndAuthenticated(t *testing.T) {
	rig := newTestRig(t)
	handler := rig.server.Handler()
	anonymous := doRequest(handler, http.MethodGet, "/api/v1/session", nil)
	if anonymous.Code != http.StatusOK || decodeBody(t, anonymous)["authenticated"] != false {
		t.Fatalf("anonymous response = %d %s", anonymous.Code, anonymous.Body.String())
	}
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	authenticated := doRequest(handler, http.MethodGet, "/api/v1/session", cookie)
	body := decodeBody(t, authenticated)
	if body["authenticated"] != true || body["csrf_token"] != "csrf-secret" {
		t.Fatalf("authenticated response = %s", authenticated.Body.String())
	}
	if strings.Contains(authenticated.Body.String(), "access-secret") || strings.Contains(authenticated.Body.String(), "refresh-secret") {
		t.Fatal("session response leaked a token")
	}
	if authenticated.Header().Get("Cache-Control") != "no-store" || authenticated.Header().Get("X-Request-ID") == "" {
		t.Fatal("security response headers are missing")
	}
}

func TestAccountPageRequiresSession(t *testing.T) {
	rig := newTestRig(t)
	anonymous := doRequest(rig.server.Handler(), http.MethodGet, "/account", nil)
	if anonymous.Code != http.StatusFound || anonymous.Header().Get("Location") != "/auth/login?return_to=%2Faccount" {
		t.Fatalf("anonymous account = %d %q", anonymous.Code, anonymous.Header().Get("Location"))
	}
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	authenticated := doRequest(rig.server.Handler(), http.MethodGet, "/account", cookie)
	if authenticated.Code != http.StatusOK || !strings.Contains(authenticated.Body.String(), "<title>account</title>") {
		t.Fatalf("authenticated account = %d %s", authenticated.Code, authenticated.Body.String())
	}
}

func TestLoginUsesSafeReturnToAndOneTimeState(t *testing.T) {
	rig := newTestRig(t)
	response := doRequest(rig.server.Handler(), http.MethodGet, "/auth/login?return_to=https://evil.example/steal", nil)
	if response.Code != http.StatusFound {
		t.Fatalf("login = %d %s", response.Code, response.Body.String())
	}
	location, _ := url.Parse(response.Header().Get("Location"))
	if location.Query().Get("code_challenge_method") != "S256" || location.Query().Get("nonce") == "" || location.Query().Get("code_challenge") == "" {
		t.Fatalf("authorization redirect is incomplete: %s", location)
	}
	state := location.Query().Get("state")
	saved, err := rig.server.consumeState(context.Background(), state)
	if err != nil || saved.ReturnTo != "/" || saved.CodeVerifier == "" {
		t.Fatalf("saved state = %#v, %v", saved, err)
	}
	if _, err := rig.server.consumeState(context.Background(), state); !errors.Is(err, securestore.ErrNotFound) {
		t.Fatalf("state replay error = %v", err)
	}
}

func TestHubAllowsIndependentEntitlementFailure(t *testing.T) {
	rig := newTestRig(t)
	rig.idp.info = oidc.UserInfo{Subject: "usr_123", Name: "Akita User", Email: "alice@example.com", EmailVerified: true}
	rig.idp.entitlementsErr = errors.New("downstream timeout containing private details")
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	response := doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/hub", cookie)
	if response.Code != http.StatusOK {
		t.Fatalf("hub = %d %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"account":{"status":"ok"`) || !strings.Contains(response.Body.String(), `"entitlements":{"status":"unavailable"`) {
		t.Fatalf("unexpected partial response: %s", response.Body.String())
	}
	for _, secret := range []string{"alice@example.com", "access-secret", "private details"} {
		if strings.Contains(response.Body.String(), secret) {
			t.Fatalf("hub leaked %q: %s", secret, response.Body.String())
		}
	}
}

func TestHubSummarizesEntitlements(t *testing.T) {
	rig := newTestRig(t)
	rig.idp.info = oidc.UserInfo{Subject: "usr_123", Name: "Akita User", Email: "alice@example.com", EmailVerified: true}
	rig.idp.entitlements = oidc.EntitlementView{
		Entitlements:  []oidc.Entitlement{{Code: "one", Status: "active"}, {Code: "two", Status: "revoked"}},
		ProductAccess: []oidc.ProductAccess{{ProductCode: "marketplace", Status: "active", EntitlementCodes: []string{"one", "one", "addon"}}},
		UpdatedAt:     rig.clock,
	}
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	response := doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/hub", cookie)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"active_count":1`) || !strings.Contains(response.Body.String(), `"active_count":2`) {
		t.Fatalf("entitlement summary = %d %s", response.Code, response.Body.String())
	}
}

func TestHubMapsMarketplaceSummaryAndBuildsTrustedLinks(t *testing.T) {
	rig := newTestRig(t)
	rig.idp.info = oidc.UserInfo{Subject: "usr_123", Name: "Akita User", Email: "alice@example.com", EmailVerified: true}
	trustedIcon := "https://marketplace.example/icon.png"
	untrustedIcon := "https://tracking.example/pixel.png"
	rig.market.summary = marketplaceclient.LibrarySummary{
		AccountSubject: "usr_123", AcquiredCount: 2, UpdateAvailableCount: 1,
		Recent: []marketplaceclient.RecentResource{
			{ResourceID: "res_1", Slug: "github-helper", Name: "GitHub Helper", ResourceType: "plugin", IconURL: &trustedIcon, AcquiredAt: rig.clock},
			{ResourceID: "res_2", Slug: "docs-helper", Name: "Docs Helper", ResourceType: "skill", IconURL: &untrustedIcon, AcquiredAt: rig.clock},
		},
	}
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	request := httptest.NewRequest(http.MethodGet, "/api/v1/hub", nil)
	request.AddCookie(cookie)
	request.Header.Set("X-Request-ID", "hub-contract-request")
	response := httptest.NewRecorder()
	rig.server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"marketplace":{"status":"ok"`) {
		t.Fatalf("marketplace hub = %d %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "https://marketplace.example/resources/github-helper") || !strings.Contains(response.Body.String(), trustedIcon) {
		t.Fatalf("trusted Marketplace fields missing: %s", response.Body.String())
	}
	if strings.Contains(response.Body.String(), untrustedIcon) || rig.market.subject != "usr_123" || rig.market.limit != 3 || rig.market.requestID != "hub-contract-request" {
		t.Fatalf("unsafe or incomplete Marketplace mapping: %s", response.Body.String())
	}
}

func TestHubDegradesMarketplaceFailureOnly(t *testing.T) {
	rig := newTestRig(t)
	rig.idp.info = oidc.UserInfo{Subject: "usr_123", Name: "Akita User", Email: "alice@example.com", EmailVerified: true}
	rig.market.err = errors.New("private Marketplace failure")
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	response := doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/hub", cookie)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"account":{"status":"ok"`) || !strings.Contains(response.Body.String(), `"marketplace":{"status":"unavailable"`) {
		t.Fatalf("Marketplace degradation = %d %s", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), "private Marketplace failure") {
		t.Fatal("Marketplace error details leaked")
	}
}

func TestHubMapsPassSummaryAndBuildsTrustedLinks(t *testing.T) {
	rig := newTestRig(t)
	rig.idp.info = oidc.UserInfo{Subject: "usr_123", Name: "Akita User", Email: "alice@example.com", EmailVerified: true}
	rig.pass.summary = passclient.Summary{
		AccountSubject: "usr_123", AccountStatus: "active",
		Balance: passclient.Balance{AvailableQuota: 2_500_000, WarningThresholdQuota: 1_000_000},
		Usage:   passclient.Usage{Available: true, Period: "month", PeriodStart: time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC), PeriodEnd: time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC), UsedQuota: 750_000, RequestCount: 42},
		Display: passclient.Display{Type: "CNY", QuotaPerUnit: 1_000_000, CurrencySymbol: "¥", CurrencyExchangeRate: 1},
		Alerts:  []string{"low_balance"}, GeneratedAt: rig.clock,
	}
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	request := httptest.NewRequest(http.MethodGet, "/api/v1/hub", nil)
	request.AddCookie(cookie)
	request.Header.Set("X-Request-ID", "pass-hub-request")
	response := httptest.NewRecorder()
	rig.server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"pass":{"status":"ok"`) ||
		!strings.Contains(response.Body.String(), `"available_quota":2500000`) || !strings.Contains(response.Body.String(), `"current_month_request_count":42`) {
		t.Fatalf("Pass hub = %d %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"pass_console":"https://pass.example/console"`) ||
		!strings.Contains(response.Body.String(), `"pass_topup":"https://pass.example/console/topup"`) ||
		rig.pass.subject != "usr_123" || rig.pass.requestID != "pass-hub-request" {
		t.Fatalf("Pass mapping or links are incomplete: %s", response.Body.String())
	}
	if strings.Contains(response.Body.String(), `"account_sub"`) {
		t.Fatal("Pass downstream identity was forwarded directly")
	}
}

func TestHubDegradesPassFailureOnly(t *testing.T) {
	rig := newTestRig(t)
	rig.idp.info = oidc.UserInfo{Subject: "usr_123", Name: "Akita User", Email: "alice@example.com", EmailVerified: true}
	rig.pass.err = errors.New("private Pass ledger failure")
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	response := doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/hub", cookie)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"account":{"status":"ok"`) || !strings.Contains(response.Body.String(), `"pass":{"status":"unavailable"`) {
		t.Fatalf("Pass degradation = %d %s", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), "private Pass ledger failure") {
		t.Fatal("Pass error details leaked")
	}
}

func TestRefreshRejectionDestroysSession(t *testing.T) {
	rig := newTestRig(t)
	rig.idp.refreshErr = &oidc.HTTPError{Status: http.StatusBadRequest, Code: "invalid_grant"}
	cookie := rig.authenticate(t, rig.clock.Add(-time.Minute))
	response := doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/hub", cookie)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("refresh rejection = %d %s", response.Code, response.Body.String())
	}
	if _, err := rig.store.GetSession(context.Background(), digest(cookie.Value)); !errors.Is(err, securestore.ErrNotFound) {
		t.Fatalf("rejected session still exists: %v", err)
	}
}

func TestLogoutRequiresOriginAndCSRF(t *testing.T) {
	rig := newTestRig(t)
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	rejected := doRequest(rig.server.Handler(), http.MethodPost, "/auth/logout", cookie)
	if rejected.Code != http.StatusForbidden {
		t.Fatalf("missing Origin = %d", rejected.Code)
	}
	request := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	request.AddCookie(cookie)
	request.Header.Set("Origin", "https://www.example")
	request.Header.Set("Sec-Fetch-Site", "same-origin")
	request.Header.Set("X-CSRF-Token", "csrf-secret")
	response := httptest.NewRecorder()
	rig.server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "logout_url") {
		t.Fatalf("logout = %d %s", response.Code, response.Body.String())
	}
}

func TestLoginRateLimitRejectsThirdRequest(t *testing.T) {
	rig := newTestRig(t)
	rig.server.cfg.AuthRateLimitPerMinute = 2
	handler := rig.server.Handler()
	for index := 0; index < 2; index++ {
		response := doRequest(handler, http.MethodGet, "/auth/login", nil)
		if response.Code != http.StatusFound {
			t.Fatalf("allowed login %d = %d %s", index, response.Code, response.Body.String())
		}
	}
	limited := doRequest(handler, http.MethodGet, "/auth/login", nil)
	if limited.Code != http.StatusTooManyRequests || limited.Header().Get("Retry-After") != "60" || !strings.Contains(limited.Body.String(), "rate_limited") {
		t.Fatalf("limited login = %d %s", limited.Code, limited.Body.String())
	}
}

func TestUntrustedClientCannotSpoofForwardedAddress(t *testing.T) {
	rig := newTestRig(t)
	rig.server.cfg.AuthRateLimitPerMinute = 1
	handler := rig.server.Handler()
	firstRequest := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	firstRequest.RemoteAddr = "192.0.2.10:1234"
	firstRequest.Header.Set("X-Forwarded-For", "198.51.100.1")
	first := httptest.NewRecorder()
	handler.ServeHTTP(first, firstRequest)
	secondRequest := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	secondRequest.RemoteAddr = "192.0.2.10:4567"
	secondRequest.Header.Set("X-Forwarded-For", "198.51.100.2")
	second := httptest.NewRecorder()
	handler.ServeHTTP(second, secondRequest)
	if first.Code != http.StatusFound || second.Code != http.StatusTooManyRequests {
		t.Fatalf("spoofed forwarded addresses bypassed limit: first=%d second=%d", first.Code, second.Code)
	}
}

func TestTrustedProxyUsesForwardedClientAddress(t *testing.T) {
	rig := newTestRig(t)
	rig.server.cfg.AuthRateLimitPerMinute = 1
	trustedProxies, err := parseTrustedProxies([]string{"10.0.0.0/8"})
	if err != nil {
		t.Fatal(err)
	}
	rig.server.trustedProxies = trustedProxies
	handler := rig.server.Handler()
	for _, client := range []string{"198.51.100.1", "198.51.100.2"} {
		request := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
		request.RemoteAddr = "10.0.0.2:443"
		request.Header.Set("X-Forwarded-For", client)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusFound {
			t.Fatalf("trusted proxy client %s = %d %s", client, response.Code, response.Body.String())
		}
	}
}

func TestMetricsUseBoundedRouteLabels(t *testing.T) {
	rig := newTestRig(t)
	handler := rig.server.Handler()
	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	request.Header.Set("X-Request-ID", "secret-looking-request-value")
	health := httptest.NewRecorder()
	handler.ServeHTTP(health, request)
	metrics := doRequest(handler, http.MethodGet, "/metrics", nil)
	if metrics.Code != http.StatusOK || !strings.Contains(metrics.Body.String(), `openakita_web_bff_http_requests_total{method="GET",route="/health",status="200"}`) {
		t.Fatalf("metrics response missing bounded route: %d", metrics.Code)
	}
	if strings.Contains(metrics.Body.String(), "secret-looking-request-value") {
		t.Fatal("request ID leaked into metric labels")
	}
}
