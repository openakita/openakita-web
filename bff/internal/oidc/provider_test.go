package oidc

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestExchangeCodeRequiresPKCEAndValidatesNonce(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	var issuer string
	var receivedVerifier string
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/.well-known/openid-configuration":
			_ = json.NewEncoder(response).Encode(map[string]string{
				"issuer": issuer, "authorization_endpoint": issuer + "/oauth/authorize", "token_endpoint": issuer + "/oauth/token",
				"userinfo_endpoint": issuer + "/oauth/userinfo", "end_session_endpoint": issuer + "/oauth/end-session", "jwks_uri": issuer + "/.well-known/jwks.json",
			})
		case "/.well-known/jwks.json":
			n := base64.RawURLEncoding.EncodeToString(privateKey.PublicKey.N.Bytes())
			e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(privateKey.PublicKey.E)).Bytes())
			_ = json.NewEncoder(response).Encode(map[string]any{"keys": []map[string]string{{"kid": "test-key", "kty": "RSA", "use": "sig", "alg": "RS256", "n": n, "e": e}}})
		case "/oauth/token":
			if err := request.ParseForm(); err != nil {
				t.Fatal(err)
			}
			receivedVerifier = request.Form.Get("code_verifier")
			claims := idTokenClaims{
				RegisteredClaims: jwt.RegisteredClaims{
					Issuer: issuer, Subject: "usr_123", Audience: jwt.ClaimStrings{"web-client"},
					ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)), IssuedAt: jwt.NewNumericDate(time.Now()),
				},
				Nonce: "nonce-ok", Type: "id",
			}
			token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
			token.Header["kid"] = "test-key"
			signed, signErr := token.SignedString(privateKey)
			if signErr != nil {
				t.Fatal(signErr)
			}
			_ = json.NewEncoder(response).Encode(map[string]any{
				"access_token": "access", "refresh_token": "refresh", "id_token": signed,
				"token_type": "Bearer", "expires_in": 3600, "scope": "openid",
			})
		default:
			http.NotFound(response, request)
		}
	}))
	defer server.Close()
	issuer = server.URL

	client, err := Discover(context.Background(), issuer, "web-client", "client-secret-for-tests", issuer+"/auth/callback", server.Client())
	if err != nil {
		t.Fatal(err)
	}
	tokens, err := client.ExchangeCode(context.Background(), "auth-code", "pkce-verifier", "nonce-ok")
	if err != nil || tokens.Subject != "usr_123" || receivedVerifier != "pkce-verifier" {
		t.Fatalf("exchange = %#v, verifier=%q, error=%v", tokens, receivedVerifier, err)
	}
	if _, err := client.ExchangeCode(context.Background(), "auth-code", "pkce-verifier", "wrong-nonce"); err == nil {
		t.Fatal("nonce mismatch was accepted")
	}
}

func TestAuthorizationURLUsesFrozenScopesAndS256(t *testing.T) {
	client := &Client{clientID: "web-client", redirectURI: "https://web.example/auth/callback", discovery: Discovery{AuthorizationEndpoint: "https://account.example/oauth/authorize"}}
	location, err := url.Parse(client.AuthorizationURL("state", "nonce", "challenge"))
	if err != nil {
		t.Fatal(err)
	}
	query := location.Query()
	if query.Get("code_challenge_method") != "S256" || query.Get("code_challenge") != "challenge" || query.Get("state") != "state" || query.Get("nonce") != "nonce" {
		t.Fatalf("authorization query = %s", location.RawQuery)
	}
	for _, scope := range []string{"openid", "profile", "email", "offline_access", "entitlements"} {
		if !strings.Contains(" "+query.Get("scope")+" ", " "+scope+" ") {
			t.Fatalf("missing scope %q in %q", scope, query.Get("scope"))
		}
	}
}
