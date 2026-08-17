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
	clock  time.Time
}

func newTestRig(t *testing.T) *testRig {
	t.Helper()
	publicURL, _ := url.Parse("https://www.example")
	issuer, _ := url.Parse("https://account.example")
	marketplace, _ := url.Parse("https://marketplace.example/")
	cfg := config.Config{
		Environment: "production", PublicURL: publicURL, AccountIssuer: issuer, MarketplaceBaseURL: marketplace,
		AccountRedirectURI: "https://www.example/auth/callback", AccountPostLogoutURI: "https://www.example/auth/logout/callback",
		SessionTTL: 24 * time.Hour, CookieSecure: true, CookieName: "__Host-oa_web_session",
		AccountUserInfoTimeout: time.Second, AccountEntitlementTimeout: time.Second, HubTimeout: 1500 * time.Millisecond,
		MarketplaceTimeout:      time.Second,
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
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	server, err := New(cfg, store, box, idp, market, []byte("<!doctype html><title>account</title>"), logger)
	if err != nil {
		t.Fatal(err)
	}
	clock := time.Date(2026, 8, 17, 8, 0, 0, 0, time.UTC)
	server.now = func() time.Time { return clock }
	return &testRig{server: server, store: store, idp: idp, market: market, clock: clock}
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
