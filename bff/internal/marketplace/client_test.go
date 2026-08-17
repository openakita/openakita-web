package marketplace

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestLibrarySummarySendsDedicatedMachineIdentity(t *testing.T) {
	var receivedPath, receivedRequestID string
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		receivedPath, receivedRequestID = request.URL.RequestURI(), request.Header.Get("X-Request-ID")
		username, password, ok := request.BasicAuth()
		if !ok || username != "openakita-web-bff" || password != "machine-secret" {
			t.Fatalf("machine credentials = %q %q %v", username, password, ok)
		}
		_ = json.NewEncoder(response).Encode(LibrarySummary{
			AccountSubject: "usr_123", AcquiredCount: 1, UpdateAvailableCount: 0,
			Recent:      []RecentResource{{ResourceID: "res_1", Slug: "helper", Name: "Helper", ResourceType: "plugin", AcquiredAt: time.Now().UTC()}},
			GeneratedAt: time.Now().UTC(),
		})
	}))
	defer server.Close()
	baseURL, _ := url.Parse(server.URL + "/")
	client, err := New(baseURL, "openakita-web-bff", "machine-secret", server.Client())
	if err != nil {
		t.Fatal(err)
	}
	summary, err := client.LibrarySummary(context.Background(), "usr_123", 3, "request-123")
	if err != nil || summary.AcquiredCount != 1 {
		t.Fatalf("summary = %+v error=%v", summary, err)
	}
	if receivedPath != "/api/v1/service/users/usr_123/library-summary?recent_limit=3" || receivedRequestID != "request-123" {
		t.Fatalf("request path=%q request_id=%q", receivedPath, receivedRequestID)
	}
}

func TestLibrarySummaryRejectsDownstreamBodyAndSubjectMismatch(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if strings.Contains(request.URL.Path, "failure") {
			response.WriteHeader(http.StatusInternalServerError)
			_, _ = response.Write([]byte(`{"error":"database DSN and private details"}`))
			return
		}
		_ = json.NewEncoder(response).Encode(LibrarySummary{AccountSubject: "different_subject", Recent: []RecentResource{}})
	}))
	defer server.Close()
	baseURL, _ := url.Parse(server.URL + "/")
	client, _ := New(baseURL, "openakita-web-bff", "machine-secret", server.Client())
	if _, err := client.LibrarySummary(context.Background(), "failure", 3, ""); err == nil || strings.Contains(err.Error(), "database DSN") {
		t.Fatalf("downstream failure error = %v", err)
	}
	if _, err := client.LibrarySummary(context.Background(), "usr_123", 3, ""); err == nil {
		t.Fatal("subject mismatch was accepted")
	}
}
