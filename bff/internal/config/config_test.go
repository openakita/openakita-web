package config

import (
	"net/url"
	"testing"
	"time"
)

func validConfig() Config {
	publicURL, _ := url.Parse("https://www.example")
	issuer, _ := url.Parse("https://account.example")
	marketplace, _ := url.Parse("https://marketplace.example/")
	return Config{
		Environment: "production", PublicURL: publicURL, AccountIssuer: issuer, MarketplaceBaseURL: marketplace,
		MarketplaceMachineID: "openakita-web-bff", MarketplaceMachineSecret: "a-production-machine-secret-over-32-characters",
		AccountClientID: "web", AccountClientSecret: "long-enough-client-secret", RedisURL: "rediss://default:secret@redis.example:6379/0",
		SessionEncryptionKeys: "configured", SessionTTL: 24 * time.Hour, TrustedProxies: []string{"10.0.0.0/8"},
		AccountRedirectURI: "https://www.example/auth/callback", AccountPostLogoutURI: "https://www.example/auth/logout/callback",
	}
}

func TestProductionConfigRequiresHTTPSAndAuthenticatedTLSRedis(t *testing.T) {
	cfg := validConfig()
	if err := cfg.Validate(); err != nil {
		t.Fatalf("valid config rejected: %v", err)
	}
	cfg.RedisURL = "redis://redis.example:6379/0"
	if err := cfg.Validate(); err == nil {
		t.Fatal("plaintext unauthenticated Redis was accepted")
	}
	cfg = validConfig()
	cfg.AccountRedirectURI = "https://evil.example/callback"
	if err := cfg.Validate(); err == nil {
		t.Fatal("cross-origin callback was accepted")
	}
}
