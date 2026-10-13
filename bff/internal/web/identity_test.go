package web

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"openakita-web-bff/internal/oidc"
	"openakita-web-bff/internal/securestore"
)

func TestIdentityRefreshWithoutTokenRotation(t *testing.T) {
	rig := newTestRig(t)
	cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
	rig.idp.refreshErr = errors.New("must not rotate valid access")
	rig.idp.info = oidc.UserInfo{Subject: "usr_123", Email: "new@example.com", EmailVerified: false, IdentityVersion: 2}
	response := doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/session?refresh=1", cookie)
	if response.Code != 200 {
		t.Fatal(response.Body.String())
	}
	stored, err := rig.server.getStoredSession(context.Background(), digest(cookie.Value))
	if err != nil || stored.EmailVerified || stored.IdentityVersion != 2 {
		t.Fatalf("profile not synchronized: %v %v", stored, err)
	}
	rig.idp.info.EmailVerified = true
	rig.idp.info.IdentityVersion = 1
	rig.server.now = func() time.Time { return rig.clock.Add(time.Second) }
	response = doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/session?refresh=1", cookie)
	if response.Code != 200 {
		t.Fatal(response.Body.String())
	}
	stored, _ = rig.server.getStoredSession(context.Background(), digest(cookie.Value))
	if stored.EmailVerified || stored.IdentityVersion != 2 {
		t.Fatal("older identity overwrote latest state")
	}
}

func TestIdentityOutageAndSubjectIsolation(t *testing.T) {
	for _, mismatch := range []bool{false, true} {
		rig := newTestRig(t)
		cookie := rig.authenticate(t, rig.clock.Add(time.Hour))
		if mismatch {
			rig.idp.info.Subject = "another-user"
		} else {
			rig.idp.infoErr = errors.New("offline")
		}
		response := doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/session?refresh=1", cookie)
		if response.Code != 503 {
			t.Fatalf("identity uncertainty should be retryable: %d", response.Code)
		}
		stored, err := rig.server.getStoredSession(context.Background(), digest(cookie.Value))
		if err != nil || stored.Subject != "usr_123" || stored.RefreshToken != "refresh-secret" {
			t.Fatal("outage changed grant")
		}
	}
}

func TestRotatedCredentialSurvivesIdentityOutageAndCannotUndoLogout(t *testing.T) {
	rig := newTestRig(t)
	cookie := rig.authenticate(t, rig.clock.Add(-time.Minute))
	rig.idp.refresh = oidc.Tokens{AccessToken: "next", RefreshToken: "rotated", ExpiresIn: 3600}
	rig.idp.infoErr = errors.New("offline")
	if response := doRequest(rig.server.Handler(), http.MethodGet, "/api/v1/session", cookie); response.Code != 503 {
		t.Fatal(response.Code)
	}
	key := digest(cookie.Value)
	stored, _ := rig.server.getStoredSession(context.Background(), key)
	if stored.RefreshToken != "rotated" {
		t.Fatal("lost rotated refresh token")
	}
	if err := rig.store.DeleteSession(context.Background(), key); err != nil {
		t.Fatal(err)
	}
	if err := rig.server.putSession(context.Background(), key, stored, "old-lock"); !errors.Is(err, securestore.ErrNotFound) {
		t.Fatal("refresh recreated a deleted session")
	}
}
