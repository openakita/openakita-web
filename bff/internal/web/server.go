package web

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"html/template"
	"log/slog"
	"net/http"
	"net/netip"
	"net/url"
	"regexp"
	"strings"
	"time"

	"openakita-web-bff/internal/config"
	"openakita-web-bff/internal/cryptobox"
	marketplaceclient "openakita-web-bff/internal/marketplace"
	"openakita-web-bff/internal/observability"
	"openakita-web-bff/internal/oidc"
	passclient "openakita-web-bff/internal/pass"
	"openakita-web-bff/internal/securestore"
)

type Server struct {
	cfg            config.Config
	store          securestore.Store
	box            *cryptobox.KeyRing
	idp            oidc.Provider
	marketplace    marketplaceclient.Provider
	pass           passclient.Provider
	accountPage    []byte
	logger         *slog.Logger
	now            func() time.Time
	metrics        *observability.Metrics
	trustedProxies []netip.Prefix
}

func New(cfg config.Config, store securestore.Store, box *cryptobox.KeyRing, idp oidc.Provider, marketplace marketplaceclient.Provider, pass passclient.Provider, accountPage []byte, logger *slog.Logger) (*Server, error) {
	if store == nil || box == nil || idp == nil || marketplace == nil || pass == nil {
		return nil, errors.New("store, encryption key ring, OIDC provider, Marketplace provider, and Pass provider are required")
	}
	if len(accountPage) == 0 {
		return nil, errors.New("account page is required")
	}
	if logger == nil {
		logger = slog.Default()
	}
	trustedProxies, err := parseTrustedProxies(cfg.TrustedProxies)
	if err != nil {
		return nil, err
	}
	return &Server{
		cfg: cfg, store: store, box: box, idp: idp, marketplace: marketplace, pass: pass,
		accountPage: accountPage, logger: logger, now: func() time.Time { return time.Now().UTC() },
		metrics: observability.NewMetrics(), trustedProxies: trustedProxies,
	}, nil
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health/live", s.handleLive)
	mux.HandleFunc("GET /health/ready", s.handleReady)
	mux.HandleFunc("GET /health", s.handleLive)
	mux.HandleFunc("GET /ready", s.handleReady)
	mux.Handle("GET /metrics", s.metrics.Handler())
	mux.HandleFunc("GET /auth/login", s.handleLogin)
	mux.HandleFunc("GET /auth/callback", s.handleCallback)
	mux.HandleFunc("POST /auth/logout", s.handleLogout)
	mux.HandleFunc("GET /auth/logout/callback", s.handleLogoutCallback)
	mux.HandleFunc("GET /api/v1/session", s.handleSession)
	mux.HandleFunc("GET /api/v1/hub", s.handleHub)
	mux.HandleFunc("GET /account", s.handleAccountPage)
	mux.HandleFunc("GET /account/", s.handleAccountPage)
	return s.middleware(mux)
}

type responseRecorder struct {
	http.ResponseWriter
	status int
}

func (r *responseRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *responseRecorder) Write(body []byte) (int, error) {
	if r.status == 0 {
		r.WriteHeader(http.StatusOK)
	}
	return r.ResponseWriter.Write(body)
}

type requestIDKey struct{}

// Preserve ResponseController support through the logging middleware.
func (r *responseRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

var requestIDPattern = regexp.MustCompile(`^[A-Za-z0-9._-]{1,64}$`)

func (s *Server) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		started := s.now()
		requestID := request.Header.Get("X-Request-ID")
		if !requestIDPattern.MatchString(requestID) {
			requestID, _ = randomToken(16)
		}
		response.Header().Set("X-Request-ID", requestID)
		response.Header().Set("X-Content-Type-Options", "nosniff")
		response.Header().Set("X-Frame-Options", "DENY")
		response.Header().Set("Content-Security-Policy", "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'")
		response.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		response.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		if strings.HasPrefix(request.URL.Path, "/api/") || strings.HasPrefix(request.URL.Path, "/auth/") || strings.HasPrefix(request.URL.Path, "/account") {
			response.Header().Set("Cache-Control", "no-store")
		}
		recorder := &responseRecorder{ResponseWriter: response}
		request = request.WithContext(context.WithValue(request.Context(), requestIDKey{}, requestID))
		if s.applyRateLimit(recorder, request) {
			next.ServeHTTP(recorder, request)
		}
		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}
		s.logger.Info("http request", "request_id", requestID, "method", request.Method, "path", request.URL.Path, "status", status, "duration_ms", s.now().Sub(started).Milliseconds())
		s.metrics.ObserveHTTP(request.Method, metricRoute(request.URL.Path), status, s.now().Sub(started))
	})
}

func metricRoute(path string) string {
	switch path {
	case "/health", "/health/live":
		return "/health"
	case "/ready", "/health/ready":
		return "/ready"
	case "/metrics", "/auth/login", "/auth/callback", "/auth/logout", "/auth/logout/callback", "/api/v1/session", "/api/v1/hub", "/account", "/account/":
		return path
	default:
		return "not_found"
	}
}

func requestID(ctx context.Context) string {
	value, _ := ctx.Value(requestIDKey{}).(string)
	return value
}

func (s *Server) handleLive(response http.ResponseWriter, _ *http.Request) {
	writeJSON(response, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleReady(response http.ResponseWriter, request *http.Request) {
	ctx, cancel := context.WithTimeout(request.Context(), time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		s.metrics.RedisError("ping")
		writeJSON(response, http.StatusServiceUnavailable, map[string]string{"status": "unavailable"})
		return
	}
	writeJSON(response, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(response http.ResponseWriter, status int, value any) {
	response.Header().Set("Content-Type", "application/json; charset=utf-8")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(value)
}

func writeError(response http.ResponseWriter, status int, code string) {
	writeJSON(response, status, map[string]string{"error": code})
}

func (s *Server) writeAuthenticationRequired(response http.ResponseWriter) {
	s.clearSessionCookie(response)
	writeJSON(response, http.StatusUnauthorized, map[string]string{
		"error": "authentication_required", "login_url": "/auth/login?return_to=%2Faccount",
	})
}

func (s *Server) writeAuthErrorPage(response http.ResponseWriter, request *http.Request, title string) {
	response.Header().Set("Content-Type", "text/html; charset=utf-8")
	response.WriteHeader(http.StatusBadRequest)
	_ = authErrorTemplate.Execute(response, struct{ Title, RequestID string }{title, requestID(request.Context())})
}

var authErrorTemplate = template.Must(template.New("auth-error").Parse(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>OpenAkita 登录失败</title></head><body><main><h1>{{.Title}}</h1><p>请返回官网后重试。</p><p>请求 ID：<code>{{.RequestID}}</code></p><a href="/">返回首页</a></main></body></html>`))

func randomToken(size int) (string, error) {
	value := make([]byte, size)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func digest(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func safeReturnTo(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" || !strings.HasPrefix(raw, "/") || strings.HasPrefix(raw, "//") || strings.Contains(raw, "\\") {
		return "/"
	}
	for _, character := range raw {
		if character < 0x20 || character == 0x7f {
			return "/"
		}
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.IsAbs() || parsed.Host != "" || parsed.Path == "" {
		return "/"
	}
	return parsed.RequestURI()
}

func constantEqual(left, right string) bool {
	leftHash := sha256.Sum256([]byte(left))
	rightHash := sha256.Sum256([]byte(right))
	return len(left) == len(right) && subtle.ConstantTimeCompare(leftHash[:], rightHash[:]) == 1
}
