package web

import (
	"errors"
	"net/http"
	"net/url"
	"strings"
)

type sessionUser struct {
	Subject       string `json:"sub"`
	DisplayName   string `json:"display_name"`
	EmailLabel    string `json:"email_label"`
	EmailVerified bool   `json:"email_verified"`
	AvatarURL     string `json:"avatar_url,omitempty"`
}

type publicLinks struct {
	Hub                 string `json:"hub,omitempty"`
	MarketplaceExplore  string `json:"marketplace_explore,omitempty"`
	MarketplaceLibrary  string `json:"marketplace_library"`
	AccountSecurity     string `json:"account_security"`
	AccountEntitlements string `json:"account_entitlements"`
	PassConsole         string `json:"pass_console"`
	PassTopUp           string `json:"pass_topup"`
}

func (s *Server) handleSession(response http.ResponseWriter, request *http.Request) {
	session, _, err := s.sessionForRequest(request.Context(), request)
	if errors.Is(err, errAnonymous) {
		s.clearSessionCookie(response)
		writeJSON(response, http.StatusOK, map[string]any{
			"authenticated": false,
			"login_url":     "/auth/login?return_to=" + url.QueryEscape(s.returnPathFromReferer(request)),
		})
		return
	}
	if err != nil {
		writeError(response, http.StatusServiceUnavailable, "temporarily_unavailable")
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{
		"authenticated": true,
		"user": sessionUser{
			Subject: session.Subject, DisplayName: session.DisplayName, EmailLabel: session.EmailLabel,
			EmailVerified: session.EmailVerified, AvatarURL: session.AvatarURL,
		},
		"csrf_token": session.CSRFToken,
		"links":      s.links(),
	})
}

func (s *Server) handleAccountPage(response http.ResponseWriter, request *http.Request) {
	if request.URL.Path != "/account" && request.URL.Path != "/account/" {
		http.NotFound(response, request)
		return
	}
	_, _, err := s.sessionForRequest(request.Context(), request)
	if errors.Is(err, errAnonymous) {
		s.clearSessionCookie(response)
		http.Redirect(response, request, "/auth/login?return_to=%2Faccount", http.StatusFound)
		return
	}
	if err != nil {
		response.Header().Set("Content-Type", "text/html; charset=utf-8")
		http.Error(response, "OpenAkita account service is temporarily unavailable.", http.StatusServiceUnavailable)
		return
	}
	response.Header().Set("Content-Type", "text/html; charset=utf-8")
	response.WriteHeader(http.StatusOK)
	_, _ = response.Write(s.accountPage)
}

func (s *Server) links() publicLinks {
	accountOrigin := s.cfg.AccountIssuer.Scheme + "://" + s.cfg.AccountIssuer.Host
	marketplace := strings.TrimSuffix(s.cfg.MarketplaceBaseURL.String(), "/")
	passConsole := s.cfg.PassPublicURL.ResolveReference(&url.URL{Path: "/console"}).String()
	passTopUp := s.cfg.PassPublicURL.ResolveReference(&url.URL{Path: "/console/topup"}).String()
	return publicLinks{
		Hub: "/account", MarketplaceExplore: marketplace + "/catalog", MarketplaceLibrary: marketplace + "/library",
		AccountSecurity: accountOrigin + "/portal?view=security", AccountEntitlements: accountOrigin + "/portal?view=entitlements",
		PassConsole: passConsole, PassTopUp: passTopUp,
	}
}

func (s *Server) returnPathFromReferer(request *http.Request) string {
	referer, err := url.Parse(strings.TrimSpace(request.Referer()))
	if err != nil || referer.Scheme != s.cfg.PublicURL.Scheme || referer.Host != s.cfg.PublicURL.Host {
		return "/"
	}
	return safeReturnTo(referer.RequestURI())
}
