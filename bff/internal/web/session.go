package web

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"openakita-web-bff/internal/oidc"
	"openakita-web-bff/internal/securestore"
)

var (
	errAnonymous          = errors.New("anonymous session")
	errSessionUnavailable = errors.New("session service unavailable")
)

type loginState struct {
	Kind         string    `json:"kind"`
	Nonce        string    `json:"nonce,omitempty"`
	CodeVerifier string    `json:"code_verifier,omitempty"`
	ReturnTo     string    `json:"return_to"`
	CreatedAt    time.Time `json:"created_at"`
}

type webSession struct {
	Subject       string    `json:"sub"`
	DisplayName   string    `json:"display_name"`
	EmailLabel    string    `json:"email_label"`
	EmailVerified bool      `json:"email_verified"`
	AvatarURL     string    `json:"avatar_url,omitempty"`
	AccessToken   string    `json:"access_token"`
	RefreshToken  string    `json:"refresh_token"`
	IDToken       string    `json:"id_token"`
	AccessExpires time.Time `json:"access_expires_at"`
	CreatedAt     time.Time `json:"created_at"`
	LastSeenAt    time.Time `json:"last_seen_at"`
	ExpiresAt     time.Time `json:"expires_at"`
	CSRFToken     string    `json:"csrf_token"`
}

func (s *Server) putState(ctx context.Context, rawState string, state loginState) error {
	key := digest(rawState)
	plaintext, err := json.Marshal(state)
	if err != nil {
		return err
	}
	encrypted, err := s.box.Encrypt(plaintext, []byte("state:"+key))
	if err != nil {
		return err
	}
	return s.store.PutState(ctx, key, encrypted, 10*time.Minute)
}

func (s *Server) consumeState(ctx context.Context, rawState string) (loginState, error) {
	key := digest(rawState)
	encrypted, err := s.store.ConsumeState(ctx, key)
	if err != nil {
		return loginState{}, err
	}
	plaintext, err := s.box.Decrypt(encrypted, []byte("state:"+key))
	if err != nil {
		return loginState{}, err
	}
	var state loginState
	if err := json.Unmarshal(plaintext, &state); err != nil {
		return loginState{}, err
	}
	if state.CreatedAt.Add(10 * time.Minute).Before(s.now()) {
		return loginState{}, securestore.ErrNotFound
	}
	return state, nil
}

func (s *Server) putSession(ctx context.Context, key string, session *webSession) error {
	remaining := session.ExpiresAt.Sub(s.now())
	if remaining <= 0 {
		return errAnonymous
	}
	plaintext, err := json.Marshal(session)
	if err != nil {
		return err
	}
	encrypted, err := s.box.Encrypt(plaintext, []byte("session:"+key))
	if err != nil {
		return err
	}
	return s.store.PutSession(ctx, key, encrypted, remaining)
}

func (s *Server) getStoredSession(ctx context.Context, key string) (*webSession, error) {
	encrypted, err := s.store.GetSession(ctx, key)
	if err != nil {
		return nil, err
	}
	plaintext, err := s.box.Decrypt(encrypted, []byte("session:"+key))
	if err != nil {
		_ = s.store.DeleteSession(ctx, key)
		return nil, errAnonymous
	}
	var session webSession
	if err := json.Unmarshal(plaintext, &session); err != nil {
		_ = s.store.DeleteSession(ctx, key)
		return nil, errAnonymous
	}
	if session.Subject == "" || session.CSRFToken == "" || !session.ExpiresAt.After(s.now()) {
		_ = s.store.DeleteSession(ctx, key)
		return nil, errAnonymous
	}
	return &session, nil
}

func (s *Server) sessionForRequest(ctx context.Context, request *http.Request) (*webSession, string, error) {
	cookie, err := request.Cookie(s.cfg.CookieName)
	if err != nil || cookie.Value == "" {
		return nil, "", errAnonymous
	}
	key := digest(cookie.Value)
	session, err := s.getStoredSession(ctx, key)
	if errors.Is(err, securestore.ErrNotFound) || errors.Is(err, errAnonymous) {
		return nil, key, errAnonymous
	}
	if err != nil {
		s.metrics.RedisError("get_session")
		return nil, key, errSessionUnavailable
	}
	if session.AccessExpires.After(s.now().Add(30 * time.Second)) {
		return session, key, nil
	}
	return s.refreshSession(ctx, key)
}

func (s *Server) refreshSession(ctx context.Context, key string) (*webSession, string, error) {
	result := "unavailable"
	defer func() { s.metrics.Session("refresh", result) }()
	lockToken, acquired, err := s.store.AcquireRefreshLock(ctx, key, 10*time.Second)
	if err != nil {
		s.metrics.RedisError("acquire_refresh_lock")
		return nil, key, errSessionUnavailable
	}
	if !acquired {
		for range 8 {
			select {
			case <-ctx.Done():
				return nil, key, errSessionUnavailable
			case <-time.After(75 * time.Millisecond):
			}
			session, loadErr := s.getStoredSession(ctx, key)
			if loadErr == nil && session.AccessExpires.After(s.now().Add(30*time.Second)) {
				result = "shared"
				return session, key, nil
			}
		}
		return nil, key, errSessionUnavailable
	}
	defer func() { _ = s.store.ReleaseRefreshLock(context.Background(), key, lockToken) }()

	session, err := s.getStoredSession(ctx, key)
	if err != nil {
		if errors.Is(err, securestore.ErrNotFound) || errors.Is(err, errAnonymous) {
			return nil, key, errAnonymous
		}
		return nil, key, errSessionUnavailable
	}
	if session.AccessExpires.After(s.now().Add(30 * time.Second)) {
		result = "shared"
		return session, key, nil
	}
	refreshCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	tokens, err := s.idp.Refresh(refreshCtx, session.RefreshToken, session.Subject)
	if err != nil {
		if oidc.IsRefreshRejected(err) || oidc.IsAuthenticationError(err) {
			_ = s.store.DeleteSession(ctx, key)
			result = "rejected"
			return nil, key, errAnonymous
		}
		return nil, key, errSessionUnavailable
	}
	session.AccessToken = tokens.AccessToken
	session.RefreshToken = tokens.RefreshToken
	session.IDToken = tokens.IDToken
	session.AccessExpires = s.now().Add(time.Duration(tokens.ExpiresIn) * time.Second)
	session.LastSeenAt = s.now()
	if err := s.putSession(ctx, key, session); err != nil {
		return nil, key, errSessionUnavailable
	}
	result = "ok"
	return session, key, nil
}

func (s *Server) setSessionCookie(response http.ResponseWriter, raw string, expires time.Time) {
	maxAge := int(expires.Sub(s.now()).Seconds())
	if maxAge < 1 {
		maxAge = 1
	}
	http.SetCookie(response, &http.Cookie{
		Name: s.cfg.CookieName, Value: raw, Path: "/", HttpOnly: true, Secure: s.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode, MaxAge: maxAge, Expires: expires,
	})
}

func (s *Server) clearSessionCookie(response http.ResponseWriter) {
	http.SetCookie(response, &http.Cookie{
		Name: s.cfg.CookieName, Value: "", Path: "/", HttpOnly: true, Secure: s.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode, MaxAge: -1, Expires: time.Unix(1, 0),
	})
}
