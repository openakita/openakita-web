package oidc

import (
	"context"
	"crypto/rsa"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Tokens struct {
	AccessToken  string
	RefreshToken string
	IDToken      string
	TokenType    string
	ExpiresIn    int64
	Scope        string
	Subject      string
}

type UserInfo struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

type Entitlement struct {
	Code      string     `json:"code"`
	Status    string     `json:"status"`
	ExpiresAt *time.Time `json:"expires_at"`
}

type ProductAccess struct {
	ProductCode      string     `json:"product_code"`
	Status           string     `json:"status"`
	EntitlementCodes []string   `json:"entitlement_codes"`
	ExpiresAt        *time.Time `json:"expires_at"`
}

type EntitlementView struct {
	ProductAccess []ProductAccess `json:"product_access"`
	Entitlements  []Entitlement   `json:"entitlements"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

type Provider interface {
	AuthorizationURL(state, nonce, codeChallenge string) string
	ExchangeCode(context.Context, string, string, string) (Tokens, error)
	Refresh(context.Context, string, string) (Tokens, error)
	UserInfo(context.Context, string) (UserInfo, error)
	Entitlements(context.Context, string) (EntitlementView, error)
	EndSessionURL(postLogoutURI, state string) string
}

type Discovery struct {
	Issuer                string `json:"issuer"`
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	UserInfoEndpoint      string `json:"userinfo_endpoint"`
	EndSessionEndpoint    string `json:"end_session_endpoint"`
	JWKSURI               string `json:"jwks_uri"`
}

type Client struct {
	discovery   Discovery
	clientID    string
	secret      string
	redirectURI string
	httpClient  *http.Client
	mu          sync.RWMutex
	keys        map[string]*rsa.PublicKey
	keysExpiry  time.Time
}

type HTTPError struct {
	Status int
	Code   string
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("OIDC endpoint returned status %d (%s)", e.Status, e.Code)
}

func IsAuthenticationError(err error) bool {
	var endpointErr *HTTPError
	return errors.As(err, &endpointErr) && (endpointErr.Status == http.StatusUnauthorized || endpointErr.Status == http.StatusForbidden)
}

func IsRefreshRejected(err error) bool {
	var endpointErr *HTTPError
	return errors.As(err, &endpointErr) && endpointErr.Status == http.StatusBadRequest
}

func StatusCode(err error) int {
	var endpointErr *HTTPError
	if errors.As(err, &endpointErr) {
		return endpointErr.Status
	}
	return 0
}

func Discover(ctx context.Context, issuer, clientID, secret, redirectURI string, httpClient *http.Client) (*Client, error) {
	issuer = strings.TrimSuffix(strings.TrimSpace(issuer), "/")
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, issuer+"/.well-known/openid-configuration", nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	response, err := httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OIDC discovery returned status %d", response.StatusCode)
	}
	var discovery Discovery
	if err := decodeJSON(response.Body, &discovery); err != nil {
		return nil, err
	}
	if strings.TrimSuffix(discovery.Issuer, "/") != issuer {
		return nil, errors.New("OIDC discovery issuer mismatch")
	}
	issuerURL, err := url.Parse(issuer)
	if err != nil {
		return nil, err
	}
	for name, raw := range map[string]string{
		"authorization": discovery.AuthorizationEndpoint, "token": discovery.TokenEndpoint,
		"userinfo": discovery.UserInfoEndpoint, "end_session": discovery.EndSessionEndpoint, "jwks": discovery.JWKSURI,
	} {
		endpoint, parseErr := url.Parse(raw)
		if parseErr != nil || !endpoint.IsAbs() || endpoint.User != nil || endpoint.Scheme != issuerURL.Scheme || endpoint.Host != issuerURL.Host {
			return nil, fmt.Errorf("OIDC %s endpoint must use the issuer origin", name)
		}
	}
	client := &Client{discovery: discovery, clientID: clientID, secret: secret, redirectURI: redirectURI, httpClient: httpClient, keys: map[string]*rsa.PublicKey{}}
	if err := client.refreshKeys(ctx); err != nil {
		return nil, fmt.Errorf("OIDC JWKS: %w", err)
	}
	return client, nil
}

func (c *Client) AuthorizationURL(state, nonce, codeChallenge string) string {
	endpoint, _ := url.Parse(c.discovery.AuthorizationEndpoint)
	query := endpoint.Query()
	query.Set("response_type", "code")
	query.Set("client_id", c.clientID)
	query.Set("redirect_uri", c.redirectURI)
	query.Set("scope", "openid profile email offline_access entitlements")
	query.Set("state", state)
	query.Set("nonce", nonce)
	query.Set("code_challenge", codeChallenge)
	query.Set("code_challenge_method", "S256")
	endpoint.RawQuery = query.Encode()
	return endpoint.String()
}

func (c *Client) ExchangeCode(ctx context.Context, code, verifier, nonce string) (Tokens, error) {
	form := url.Values{
		"grant_type": {"authorization_code"}, "code": {code}, "redirect_uri": {c.redirectURI},
		"client_id": {c.clientID}, "client_secret": {c.secret}, "code_verifier": {verifier},
	}
	tokens, err := c.exchange(ctx, form)
	if err != nil {
		return Tokens{}, err
	}
	claims, err := c.verifyIDToken(ctx, tokens.IDToken, nonce)
	if err != nil {
		return Tokens{}, err
	}
	tokens.Subject = claims.Subject
	return tokens, nil
}

func (c *Client) Refresh(ctx context.Context, refreshToken, subject string) (Tokens, error) {
	form := url.Values{
		"grant_type": {"refresh_token"}, "refresh_token": {refreshToken},
		"client_id": {c.clientID}, "client_secret": {c.secret},
	}
	tokens, err := c.exchange(ctx, form)
	if err != nil {
		return Tokens{}, err
	}
	claims, err := c.verifyIDToken(ctx, tokens.IDToken, "")
	if err != nil || claims.Subject != subject {
		return Tokens{}, errors.New("refreshed ID token subject mismatch")
	}
	tokens.Subject = claims.Subject
	return tokens, nil
}

func (c *Client) exchange(ctx context.Context, form url.Values) (Tokens, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.discovery.TokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return Tokens{}, err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("Accept", "application/json")
	response, err := c.httpClient.Do(request)
	if err != nil {
		return Tokens{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return Tokens{}, decodeHTTPError(response)
	}
	var raw struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		IDToken      string `json:"id_token"`
		TokenType    string `json:"token_type"`
		ExpiresIn    int64  `json:"expires_in"`
		Scope        string `json:"scope"`
	}
	if err := decodeJSON(response.Body, &raw); err != nil {
		return Tokens{}, err
	}
	if raw.AccessToken == "" || raw.RefreshToken == "" || raw.IDToken == "" || !strings.EqualFold(raw.TokenType, "Bearer") || raw.ExpiresIn <= 0 {
		return Tokens{}, errors.New("OIDC token response is incomplete")
	}
	return Tokens{
		AccessToken: raw.AccessToken, RefreshToken: raw.RefreshToken, IDToken: raw.IDToken,
		TokenType: raw.TokenType, ExpiresIn: raw.ExpiresIn, Scope: raw.Scope,
	}, nil
}

func (c *Client) UserInfo(ctx context.Context, accessToken string) (UserInfo, error) {
	var result UserInfo
	if err := c.bearerJSON(ctx, c.discovery.UserInfoEndpoint, accessToken, &result); err != nil {
		return UserInfo{}, err
	}
	if result.Subject == "" {
		return UserInfo{}, errors.New("OIDC userinfo subject is missing")
	}
	return result, nil
}

func (c *Client) Entitlements(ctx context.Context, accessToken string) (EntitlementView, error) {
	issuer, _ := url.Parse(c.discovery.Issuer)
	endpoint := issuer.ResolveReference(&url.URL{Path: "/api/v1/me/entitlements"}).String()
	var result EntitlementView
	if err := c.bearerJSON(ctx, endpoint, accessToken, &result); err != nil {
		return EntitlementView{}, err
	}
	return result, nil
}

func (c *Client) bearerJSON(ctx context.Context, endpoint, accessToken string, target any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	request.Header.Set("Accept", "application/json")
	response, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return decodeHTTPError(response)
	}
	return decodeJSON(response.Body, target)
}

func (c *Client) EndSessionURL(postLogoutURI, state string) string {
	endpoint, _ := url.Parse(c.discovery.EndSessionEndpoint)
	query := endpoint.Query()
	query.Set("client_id", c.clientID)
	query.Set("post_logout_redirect_uri", postLogoutURI)
	query.Set("state", state)
	endpoint.RawQuery = query.Encode()
	return endpoint.String()
}

type idTokenClaims struct {
	jwt.RegisteredClaims
	Nonce string `json:"nonce"`
	Type  string `json:"typ"`
}

func (c *Client) verifyIDToken(ctx context.Context, raw, expectedNonce string) (*idTokenClaims, error) {
	claims := &idTokenClaims{}
	keyfunc := func(token *jwt.Token) (any, error) {
		kid, _ := token.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("ID token key ID is missing")
		}
		key := c.key(kid)
		if key == nil {
			if err := c.refreshKeys(ctx); err != nil {
				return nil, err
			}
			key = c.key(kid)
		}
		if key == nil {
			return nil, errors.New("ID token signing key is unknown")
		}
		return key, nil
	}
	token, err := jwt.ParseWithClaims(raw, claims, keyfunc,
		jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(c.discovery.Issuer),
		jwt.WithAudience(c.clientID), jwt.WithExpirationRequired(), jwt.WithIssuedAt(), jwt.WithLeeway(30*time.Second))
	if err != nil || !token.Valid || claims.Subject == "" || claims.Type != "id" {
		return nil, errors.New("ID token validation failed")
	}
	if expectedNonce != "" && !constantEqual(claims.Nonce, expectedNonce) {
		return nil, errors.New("ID token nonce mismatch")
	}
	return claims, nil
}

func (c *Client) key(kid string) *rsa.PublicKey {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if time.Now().After(c.keysExpiry) {
		return nil
	}
	return c.keys[kid]
}

func (c *Client) refreshKeys(ctx context.Context) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.discovery.JWKSURI, nil)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	response, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS returned status %d", response.StatusCode)
	}
	var set struct {
		Keys []struct {
			KeyID string `json:"kid"`
			Type  string `json:"kty"`
			Use   string `json:"use"`
			Alg   string `json:"alg"`
			N     string `json:"n"`
			E     string `json:"e"`
		} `json:"keys"`
	}
	if err := decodeJSON(response.Body, &set); err != nil {
		return err
	}
	keys := map[string]*rsa.PublicKey{}
	for _, raw := range set.Keys {
		if raw.KeyID == "" || raw.Type != "RSA" || raw.Alg != "RS256" || (raw.Use != "" && raw.Use != "sig") {
			continue
		}
		nBytes, nErr := base64.RawURLEncoding.DecodeString(raw.N)
		eBytes, eErr := base64.RawURLEncoding.DecodeString(raw.E)
		if nErr != nil || eErr != nil || len(nBytes) < 256 || len(eBytes) == 0 || len(eBytes) > 4 {
			continue
		}
		exponent := 0
		for _, value := range eBytes {
			exponent = exponent<<8 + int(value)
		}
		if exponent < 3 {
			continue
		}
		keys[raw.KeyID] = &rsa.PublicKey{N: new(big.Int).SetBytes(nBytes), E: exponent}
	}
	if len(keys) == 0 {
		return errors.New("JWKS contains no acceptable RS256 keys")
	}
	c.mu.Lock()
	c.keys = keys
	c.keysExpiry = time.Now().Add(5 * time.Minute)
	c.mu.Unlock()
	return nil
}

func decodeJSON(reader io.Reader, target any) error {
	decoder := json.NewDecoder(io.LimitReader(reader, 1<<20))
	return decoder.Decode(target)
}

func decodeHTTPError(response *http.Response) error {
	var body struct {
		Error string `json:"error"`
	}
	_ = json.NewDecoder(io.LimitReader(response.Body, 64<<10)).Decode(&body)
	if body.Error == "" {
		body.Error = "endpoint_error"
	}
	return &HTTPError{Status: response.StatusCode, Code: body.Error}
}

func constantEqual(left, right string) bool {
	if len(left) != len(right) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(left), []byte(right)) == 1
}
