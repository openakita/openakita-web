package web

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func (s *Server) handleLogin(response http.ResponseWriter, request *http.Request) {
	result := "internal_error"
	defer func() { s.metrics.OIDC("login", result) }()
	state, err := randomToken(32)
	if err != nil {
		writeError(response, http.StatusInternalServerError, "internal_error")
		return
	}
	nonce, err := randomToken(32)
	if err != nil {
		writeError(response, http.StatusInternalServerError, "internal_error")
		return
	}
	verifier, err := randomToken(48)
	if err != nil {
		writeError(response, http.StatusInternalServerError, "internal_error")
		return
	}
	challengeHash := sha256.Sum256([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(challengeHash[:])
	login := loginState{Kind: "login", Nonce: nonce, CodeVerifier: verifier, ReturnTo: safeReturnTo(request.URL.Query().Get("return_to")), CreatedAt: s.now()}
	if err := s.putState(request.Context(), state, login); err != nil {
		result = "state_unavailable"
		s.metrics.RedisError("put_oidc_state")
		writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
		return
	}
	result = "started"
	http.Redirect(response, request, s.idp.AuthorizationURL(state, nonce, challenge), http.StatusFound)
}

func (s *Server) handleCallback(response http.ResponseWriter, request *http.Request) {
	result := "invalid_request"
	defer func() { s.metrics.OIDC("callback", result) }()
	rawState := request.URL.Query().Get("state")
	if rawState == "" {
		s.writeAuthErrorPage(response, request, "登录请求无效")
		return
	}
	state, err := s.consumeState(request.Context(), rawState)
	if err != nil || state.Kind != "login" {
		result = "invalid_state"
		s.writeAuthErrorPage(response, request, "登录请求已过期或已使用")
		return
	}
	if request.URL.Query().Get("error") != "" || request.URL.Query().Get("code") == "" {
		result = "authorization_rejected"
		s.writeAuthErrorPage(response, request, "Account 未完成授权")
		return
	}
	exchangeCtx, cancel := context.WithTimeout(request.Context(), 4*time.Second)
	defer cancel()
	tokens, err := s.idp.ExchangeCode(exchangeCtx, request.URL.Query().Get("code"), state.CodeVerifier, state.Nonce)
	if err != nil {
		result = "token_exchange_failed"
		s.writeAuthErrorPage(response, request, "登录验证失败")
		return
	}
	infoCtx, infoCancel := context.WithTimeout(request.Context(), s.cfg.AccountUserInfoTimeout)
	defer infoCancel()
	info, err := s.idp.UserInfo(infoCtx, tokens.AccessToken)
	if err != nil || info.Subject == "" || info.Subject != tokens.Subject {
		result = "userinfo_failed"
		s.writeAuthErrorPage(response, request, "账户资料验证失败")
		return
	}
	rawSession, err := randomToken(32)
	if err != nil {
		writeError(response, http.StatusInternalServerError, "internal_error")
		return
	}
	csrf, err := randomToken(32)
	if err != nil {
		writeError(response, http.StatusInternalServerError, "internal_error")
		return
	}
	now := s.now()
	session := &webSession{
		Subject: info.Subject, DisplayName: displayName(info.Name), EmailLabel: maskEmail(info.Email),
		EmailVerified: info.EmailVerified, AvatarURL: s.safeAvatarURL(info.Picture),
		AccessToken: tokens.AccessToken, RefreshToken: tokens.RefreshToken, IDToken: tokens.IDToken,
		AccessExpires: now.Add(time.Duration(tokens.ExpiresIn) * time.Second), CreatedAt: now, LastSeenAt: now,
		ExpiresAt: now.Add(s.cfg.SessionTTL), CSRFToken: csrf,
	}
	key := digest(rawSession)
	if err := s.putSession(request.Context(), key, session); err != nil {
		result = "session_unavailable"
		s.metrics.RedisError("put_session")
		s.metrics.Session("create", "error")
		writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
		return
	}
	result = "success"
	s.metrics.Session("create", "ok")
	s.setSessionCookie(response, rawSession, session.ExpiresAt)
	http.Redirect(response, request, state.ReturnTo, http.StatusSeeOther)
}

func (s *Server) handleLogout(response http.ResponseWriter, request *http.Request) {
	if !s.validCSRFOrigin(request) {
		writeError(response, http.StatusForbidden, "csrf_validation_failed")
		return
	}
	session, key, err := s.sessionForRequest(request.Context(), request)
	if err != nil {
		if err == errSessionUnavailable {
			writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
			return
		}
		s.writeAuthenticationRequired(response)
		return
	}
	if !constantEqual(request.Header.Get("X-CSRF-Token"), session.CSRFToken) {
		writeError(response, http.StatusForbidden, "csrf_validation_failed")
		return
	}
	if err := s.store.DeleteSession(request.Context(), key); err != nil {
		s.metrics.RedisError("delete_session")
		s.metrics.Session("destroy", "error")
		writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
		return
	}
	s.metrics.Session("destroy", "ok")
	s.clearSessionCookie(response)
	state, err := randomToken(32)
	if err != nil {
		writeError(response, http.StatusInternalServerError, "internal_error")
		return
	}
	logoutState := loginState{Kind: "logout", ReturnTo: "/", CreatedAt: s.now()}
	if err := s.putState(request.Context(), state, logoutState); err != nil {
		s.metrics.RedisError("put_logout_state")
		writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
		return
	}
	writeJSON(response, http.StatusOK, map[string]string{"logout_url": s.idp.EndSessionURL(s.cfg.AccountPostLogoutURI, state)})
}

func (s *Server) handleLogoutCallback(response http.ResponseWriter, request *http.Request) {
	state, err := s.consumeState(request.Context(), request.URL.Query().Get("state"))
	if err != nil || state.Kind != "logout" {
		s.writeAuthErrorPage(response, request, "退出请求无效或已过期")
		return
	}
	http.Redirect(response, request, state.ReturnTo, http.StatusSeeOther)
}

func (s *Server) validCSRFOrigin(request *http.Request) bool {
	origin := strings.TrimSpace(request.Header.Get("Origin"))
	if origin == "" || origin != s.cfg.PublicURL.Scheme+"://"+s.cfg.PublicURL.Host {
		return false
	}
	if fetchSite := request.Header.Get("Sec-Fetch-Site"); fetchSite != "" && fetchSite != "same-origin" {
		return false
	}
	return true
}

func displayName(value string) string {
	if value = strings.TrimSpace(value); value != "" {
		return value
	}
	return "OpenAkita"
}

func maskEmail(raw string) string {
	raw = strings.TrimSpace(raw)
	at := strings.LastIndex(raw, "@")
	if at <= 0 || at == len(raw)-1 {
		return ""
	}
	local := []rune(raw[:at])
	if len(local) == 0 {
		return ""
	}
	return string(local[0]) + "***" + raw[at:]
}

func (s *Server) safeAvatarURL(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || !parsed.IsAbs() || parsed.Scheme != "https" || parsed.User != nil {
		return ""
	}
	if !s.cfg.AvatarAllowedOrigins[parsed.Scheme+"://"+parsed.Host] {
		return ""
	}
	return parsed.String()
}
