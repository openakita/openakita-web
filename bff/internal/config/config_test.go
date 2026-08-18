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
	passURL, _ := url.Parse("https://pass.example/")
	return Config{
		Environment: "production", PublicURL: publicURL, AccountIssuer: issuer, MarketplaceBaseURL: marketplace,
		PassBaseURL: passURL, PassPublicURL: passURL,
		MarketplaceMachineID: "openakita-web-bff", MarketplaceMachineSecret: "a-production-machine-secret-over-32-characters",
		PassMachineID: "openakita-web-bff", PassMachineSecret: "a-dedicated-pass-machine-secret-over-32-characters",
		AccountClientID: "web", AccountClientSecret: "long-enough-client-secret", RedisURL: "rediss://default:secret@redis.example:6379/0",
		SessionEncryptionKeys: "configured", SessionTTL: 24 * time.Hour, TrustedProxies: []string{"10.0.0.0/8"},
		AuthRateLimitPerMinute: 30, APIRateLimitPerMinute: 240,
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
	cfg = validConfig()
	cfg.TrustedProxies = []string{"not-a-network"}
	if err := cfg.Validate(); err == nil {
		t.Fatal("invalid trusted proxy was accepted")
	}
	cfg = validConfig()
	cfg.AuthRateLimitPerMinute = 0
	if err := cfg.Validate(); err == nil {
		t.Fatal("non-positive rate limit was accepted")
	}
}

func TestConfigRejectsReusedPassMachineSecret(t *testing.T) {
	cfg := validConfig()
	cfg.PassMachineSecret = cfg.MarketplaceMachineSecret
	if err := cfg.Validate(); err == nil {
		t.Fatal("Marketplace machine secret was reused for Pass")
	}
	cfg = validConfig()
	cfg.PassMachineSecret = cfg.AccountClientSecret
	if err := cfg.Validate(); err == nil {
		t.Fatal("Account client secret was reused for Pass")
	}
}
