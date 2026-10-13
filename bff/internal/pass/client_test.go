package pass

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

func TestSummarySendsDedicatedMachineIdentityAndValidatesContract(t *testing.T) {
	now := time.Now().UTC()
	var receivedPath, receivedRequestID string
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		receivedPath, receivedRequestID = request.URL.Path, request.Header.Get("X-Request-ID")
		username, password, ok := request.BasicAuth()
		if !ok || username != "openakita-web-bff" || password != "pass-secret" {
			t.Fatalf("machine credentials = %q %q %v", username, password, ok)
		}
		_ = json.NewEncoder(response).Encode(map[string]any{"success": true, "data": Summary{
			AccountSubject: "usr_123", AccountStatus: "active", Balance: Balance{AvailableQuota: 2_500_000, WarningThresholdQuota: 1_000_000},
			Usage:   Usage{Available: true, Period: "month", PeriodStart: now.AddDate(0, 0, -1), PeriodEnd: now.AddDate(0, 1, 0), UsedQuota: 750_000, RequestCount: 42},
			Display: Display{Type: "CNY", QuotaPerUnit: 1_000_000, CurrencySymbol: "¥", CurrencyExchangeRate: 1}, Alerts: []string{}, GeneratedAt: now,
		}})
	}))
	defer server.Close()
	baseURL, _ := url.Parse(server.URL + "/")
	client, err := New(baseURL, "openakita-web-bff", "pass-secret", server.Client())
	if err != nil {
		t.Fatal(err)
	}
	summary, err := client.Summary(context.Background(), "usr_123", "request-123")
	if err != nil || summary.Balance.AvailableQuota != 2_500_000 {
		t.Fatalf("summary = %+v error=%v", summary, err)
	}
	if receivedPath != "/api/internal/openakita/users/usr_123/summary" || receivedRequestID != "request-123" {
		t.Fatalf("request path=%q request_id=%q", receivedPath, receivedRequestID)
	}
}

func TestSummaryRejectsDownstreamBodyAndInconsistentResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if strings.Contains(request.URL.Path, "failure") {
			response.WriteHeader(http.StatusInternalServerError)
			_, _ = response.Write([]byte(`{"error":"private ledger details"}`))
			return
		}
		_ = json.NewEncoder(response).Encode(map[string]any{"success": true, "data": Summary{AccountSubject: "different-subject"}})
	}))
	defer server.Close()
	baseURL, _ := url.Parse(server.URL + "/")
	client, _ := New(baseURL, "openakita-web-bff", "pass-secret", server.Client())
	if _, err := client.Summary(context.Background(), "failure", ""); err == nil || strings.Contains(err.Error(), "private ledger") {
		t.Fatalf("downstream failure error = %v", err)
	}
	if _, err := client.Summary(context.Background(), "usr_123", ""); err == nil {
		t.Fatal("inconsistent Pass response was accepted")
	}
}
