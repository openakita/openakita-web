package web

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"strings"
	"time"
)

func parseTrustedProxies(values []string) ([]netip.Prefix, error) {
	result := make([]netip.Prefix, 0, len(values))
	for _, raw := range values {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		prefix, err := netip.ParsePrefix(raw)
		if err != nil {
			address, addressErr := netip.ParseAddr(raw)
			if addressErr != nil {
				return nil, fmt.Errorf("invalid trusted proxy %q", raw)
			}
			prefix = netip.PrefixFrom(address, address.BitLen())
		}
		result = append(result, prefix.Masked())
	}
	return result, nil
}

func (s *Server) applyRateLimit(response http.ResponseWriter, request *http.Request) bool {
	limit, bucket := 0, ""
	switch request.URL.Path {
	case "/api/v1/chat/models", "/api/v1/chat/completions":
		limit, bucket = 20, "chat"
	case "/auth/login", "/auth/callback":
		limit, bucket = s.cfg.AuthRateLimitPerMinute, "auth"
	case "/auth/logout", "/auth/logout/callback", "/api/v1/session", "/api/v1/hub", "/account", "/account/":
		limit, bucket = s.cfg.APIRateLimitPerMinute, "api"
	default:
		return true
	}
	if limit < 1 {
		return true
	}
	client := s.clientAddress(request)
	key := bucket + ":" + digest(client)
	ctx, cancel := contextWithTimeout(request, 500*time.Millisecond)
	defer cancel()
	remaining, allowed, err := s.store.AllowFixedWindow(ctx, key, limit, time.Minute)
	if err != nil {
		s.metrics.RedisError("rate_limit")
		writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
		return false
	}
	response.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
	response.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
	if allowed {
		return true
	}
	response.Header().Set("Retry-After", "60")
	s.metrics.RateLimited(metricRoute(request.URL.Path))
	writeError(response, http.StatusTooManyRequests, "rate_limited")
	return false
}

func contextWithTimeout(request *http.Request, timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(request.Context(), timeout)
}

func (s *Server) clientAddress(request *http.Request) string {
	remote := parseRemoteAddress(request.RemoteAddr)
	if !s.isTrustedProxy(remote) {
		return remote.String()
	}
	forwarded := strings.Split(request.Header.Get("X-Forwarded-For"), ",")
	for index := len(forwarded) - 1; index >= 0; index-- {
		address, err := netip.ParseAddr(strings.TrimSpace(forwarded[index]))
		if err != nil {
			continue
		}
		address = address.Unmap()
		if !s.isTrustedProxy(address) {
			return address.String()
		}
	}
	return remote.String()
}

func parseRemoteAddress(raw string) netip.Addr {
	host, _, err := net.SplitHostPort(raw)
	if err != nil {
		host = raw
	}
	address, err := netip.ParseAddr(strings.TrimSpace(host))
	if err != nil {
		return netip.IPv4Unspecified()
	}
	return address.Unmap()
}

func (s *Server) isTrustedProxy(address netip.Addr) bool {
	for _, prefix := range s.trustedProxies {
		if prefix.Contains(address) {
			return true
		}
	}
	return false
}
