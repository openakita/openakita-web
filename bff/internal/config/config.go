package config

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment               string
	HTTPAddr                  string
	PublicURL                 *url.URL
	AccountIssuer             *url.URL
	AccountClientID           string
	AccountClientSecret       string
	AccountRedirectURI        string
	AccountPostLogoutURI      string
	MarketplaceBaseURL        *url.URL
	MarketplaceMachineID      string
	MarketplaceMachineSecret  string
	MarketplaceAssetOrigins   map[string]bool
	RedisURL                  string
	SessionEncryptionKeys     string
	SessionTTL                time.Duration
	AccountPagePath           string
	AvatarAllowedOrigins      map[string]bool
	TrustedProxies            []string
	CookieSecure              bool
	CookieName                string
	AccountUserInfoTimeout    time.Duration
	AccountEntitlementTimeout time.Duration
	HubTimeout                time.Duration
	MarketplaceTimeout        time.Duration
}

func Load() (Config, error) {
	environment := env("WEB_BFF_ENV", "development")
	publicURL, err := parseURL(env("WEB_BFF_PUBLIC_URL", "http://127.0.0.1:8080"))
	if err != nil {
		return Config{}, fmt.Errorf("WEB_BFF_PUBLIC_URL: %w", err)
	}
	issuer, err := parseURL(os.Getenv("WEB_BFF_ACCOUNT_ISSUER"))
	if err != nil {
		return Config{}, fmt.Errorf("WEB_BFF_ACCOUNT_ISSUER: %w", err)
	}
	marketplaceURL, err := parseURL(env("WEB_BFF_MARKETPLACE_BASE_URL", "https://marketplace.fzstack.com/"))
	if err != nil {
		return Config{}, fmt.Errorf("WEB_BFF_MARKETPLACE_BASE_URL: %w", err)
	}
	ttl, err := time.ParseDuration(env("WEB_BFF_SESSION_TTL", "720h"))
	if err != nil {
		return Config{}, fmt.Errorf("WEB_BFF_SESSION_TTL: %w", err)
	}
	pagePath := env("WEB_BFF_ACCOUNT_PAGE_PATH", filepath.FromSlash("../dist/account/index.html"))
	redirectURI := env("WEB_BFF_ACCOUNT_REDIRECT_URI", publicURL.ResolveReference(&url.URL{Path: "/auth/callback"}).String())
	postLogoutURI := env("WEB_BFF_ACCOUNT_POST_LOGOUT_REDIRECT_URI", publicURL.ResolveReference(&url.URL{Path: "/auth/logout/callback"}).String())
	avatarOrigins := map[string]bool{issuer.Scheme + "://" + issuer.Host: true}
	for _, raw := range splitCSV(os.Getenv("WEB_BFF_AVATAR_ALLOWED_ORIGINS")) {
		parsed, parseErr := parseURL(raw)
		if parseErr != nil {
			return Config{}, fmt.Errorf("WEB_BFF_AVATAR_ALLOWED_ORIGINS: %w", parseErr)
		}
		avatarOrigins[parsed.Scheme+"://"+parsed.Host] = true
	}
	marketplaceAssetOrigins := map[string]bool{marketplaceURL.Scheme + "://" + marketplaceURL.Host: true}
	for _, raw := range splitCSV(os.Getenv("WEB_BFF_MARKETPLACE_ASSET_ALLOWED_ORIGINS")) {
		parsed, parseErr := parseURL(raw)
		if parseErr != nil || parsed.Scheme != "https" {
			return Config{}, fmt.Errorf("WEB_BFF_MARKETPLACE_ASSET_ALLOWED_ORIGINS: HTTPS origins are required")
		}
		marketplaceAssetOrigins[parsed.Scheme+"://"+parsed.Host] = true
	}
	cfg := Config{
		Environment: environment, HTTPAddr: env("WEB_BFF_HTTP_ADDR", "127.0.0.1:8080"),
		PublicURL: publicURL, AccountIssuer: issuer,
		AccountClientID:     strings.TrimSpace(os.Getenv("WEB_BFF_ACCOUNT_CLIENT_ID")),
		AccountClientSecret: strings.TrimSpace(os.Getenv("WEB_BFF_ACCOUNT_CLIENT_SECRET")),
		AccountRedirectURI:  redirectURI, AccountPostLogoutURI: postLogoutURI,
		MarketplaceBaseURL:       marketplaceURL,
		MarketplaceMachineID:     strings.TrimSpace(os.Getenv("WEB_BFF_MARKETPLACE_MACHINE_ID")),
		MarketplaceMachineSecret: strings.TrimSpace(os.Getenv("WEB_BFF_MARKETPLACE_MACHINE_SECRET")),
		MarketplaceAssetOrigins:  marketplaceAssetOrigins,
		RedisURL:                 strings.TrimSpace(os.Getenv("WEB_BFF_REDIS_URL")),
		SessionEncryptionKeys:    strings.TrimSpace(os.Getenv("WEB_BFF_SESSION_ENCRYPTION_KEYS")),
		SessionTTL:               ttl, AccountPagePath: pagePath, AvatarAllowedOrigins: avatarOrigins,
		TrustedProxies: splitCSV(os.Getenv("WEB_BFF_TRUSTED_PROXIES")),
		CookieSecure:   environment == "production", AccountUserInfoTimeout: 1500 * time.Millisecond,
		AccountEntitlementTimeout: 2 * time.Second, MarketplaceTimeout: 2 * time.Second, HubTimeout: 2500 * time.Millisecond,
	}
	if cfg.CookieSecure {
		cfg.CookieName = "__Host-oa_web_session"
	} else {
		cfg.CookieName = "oa_web_session"
	}
	return cfg, cfg.Validate()
}

func (c Config) Validate() error {
	if c.PublicURL == nil || c.AccountIssuer == nil || c.MarketplaceBaseURL == nil {
		return errors.New("public, Account, and Marketplace URLs are required")
	}
	if c.AccountClientID == "" || len(c.AccountClientSecret) < 16 {
		return errors.New("Account confidential client ID and a client secret of at least 16 characters are required")
	}
	if c.RedisURL == "" {
		return errors.New("WEB_BFF_REDIS_URL is required")
	}
	if c.SessionEncryptionKeys == "" {
		return errors.New("WEB_BFF_SESSION_ENCRYPTION_KEYS is required")
	}
	if c.MarketplaceMachineID != "openakita-web-bff" || len(c.MarketplaceMachineSecret) < 16 {
		return errors.New("dedicated Marketplace machine credentials are required")
	}
	if c.SessionTTL <= 0 || c.SessionTTL > 30*24*time.Hour {
		return errors.New("session TTL must be greater than zero and at most 30 days")
	}
	if err := validateCallback(c.AccountRedirectURI, c.PublicURL); err != nil {
		return fmt.Errorf("Account redirect URI: %w", err)
	}
	if err := validateCallback(c.AccountPostLogoutURI, c.PublicURL); err != nil {
		return fmt.Errorf("Account post-logout URI: %w", err)
	}
	if !strings.HasSuffix(c.MarketplaceBaseURL.Path, "/") {
		return errors.New("Marketplace base URL must end with /")
	}
	if c.Environment == "production" {
		if len(c.MarketplaceMachineSecret) < 32 {
			return errors.New("production Marketplace machine secret must contain at least 32 characters")
		}
		for name, endpoint := range map[string]*url.URL{"public": c.PublicURL, "Account": c.AccountIssuer, "Marketplace": c.MarketplaceBaseURL} {
			if endpoint.Scheme != "https" {
				return fmt.Errorf("production %s URL must use HTTPS", name)
			}
		}
		redisURL, err := url.Parse(c.RedisURL)
		if err != nil || redisURL.Scheme != "rediss" || redisURL.User == nil {
			return errors.New("production Redis URL must use rediss:// with authentication")
		}
		if password, ok := redisURL.User.Password(); !ok || password == "" {
			return errors.New("production Redis URL must include a password")
		}
		if len(c.TrustedProxies) == 0 {
			return errors.New("production trusted proxies must be configured")
		}
	} else {
		for _, endpoint := range []*url.URL{c.PublicURL, c.AccountIssuer, c.MarketplaceBaseURL} {
			if endpoint.Scheme != "https" && !isLoopback(endpoint.Hostname()) {
				return errors.New("plain HTTP is allowed only for loopback development URLs")
			}
		}
	}
	return nil
}

func validateCallback(raw string, publicURL *url.URL) error {
	parsed, err := url.Parse(raw)
	if err != nil || !parsed.IsAbs() || parsed.User != nil {
		return errors.New("must be an absolute URL without credentials")
	}
	if parsed.Scheme != publicURL.Scheme || parsed.Host != publicURL.Host {
		return errors.New("must use the configured public origin")
	}
	return nil
}

func parseURL(raw string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || !parsed.IsAbs() || parsed.Host == "" || parsed.User != nil {
		return nil, errors.New("must be an absolute URL without credentials")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, errors.New("scheme must be HTTP or HTTPS")
	}
	return parsed, nil
}

func isLoopback(host string) bool {
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func env(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}

func splitCSV(raw string) []string {
	values := []string{}
	for _, value := range strings.Split(raw, ",") {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}

func BoolEnv(name string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	return err == nil && value
}
