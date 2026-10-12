package web

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type chatTransport func(*http.Request) (*http.Response, error)

func (f chatTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func chatRequest(handler http.Handler, host, origin, path, payload string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(http.MethodPost, "https://"+host+"/api/v1/chat/"+path, strings.NewReader(payload))
	r.Header.Set("Origin", origin)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	return w
}

func chatPayload(provider string) string {
	return `{"provider":"` + provider + `","api_key":"test-provider-secret","model":"test-model","messages":[{"role":"user","content":"Hello"}]}`
}

func TestChatDomainAndOriginGates(t *testing.T) {
	rig := newTestRig(t)
	rig.server.chatClient.Transport = chatTransport(func(r *http.Request) (*http.Response, error) {
		t.Fatal("blocked requests must not reach providers")
		return nil, nil
	})
	for _, host := range []string{"openakita.cn", "www.openakita.cn", "openakita.ai.attacker.example", "localhost:5173", "unknown.example", "openakita.ai:8080"} {
		for _, path := range []string{"models", "completions"} {
			w := chatRequest(rig.server.Handler(), host, "https://"+host, path, chatPayload("openai"))
			if w.Code != 404 {
				t.Fatalf("%s/%s: expected 404, got %d", host, path, w.Code)
			}
		}
		w := doRequest(rig.server.Handler(), "GET", "https://"+host+"/api/v1/chat/capabilities", nil)
		if w.Code != 404 {
			t.Fatalf("%s: capabilities should be unavailable", host)
		}
	}
	for _, origin := range []string{"", "https://openakita.cn", "https://attacker.example", "http://openakita.ai", "https://www.openakita.ai"} {
		w := chatRequest(rig.server.Handler(), "openakita.ai", origin, "completions", chatPayload("openai"))
		if w.Code != 403 {
			t.Fatalf("origin %q: expected 403, got %d", origin, w.Code)
		}
	}
	for _, host := range []string{"openakita.ai", "www.openakita.ai"} {
		w := doRequest(rig.server.Handler(), "GET", "https://"+host+"/api/v1/chat/capabilities", nil)
		if w.Code != 200 || !strings.Contains(w.Body.String(), `"enabled":true`) || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatalf("capabilities failed: %s", w.Body.String())
		}
	}
	rig.server.cfg.Environment = "development"
	w := doRequest(rig.server.Handler(), "GET", "http://127.0.0.1:5173/api/v1/chat/capabilities", nil)
	if w.Code != 200 {
		t.Fatal("loopback development must work")
	}
}

func TestChatProviderStreaming(t *testing.T) {
	for _, provider := range []string{"openai", "anthropic", "xai"} {
		t.Run(provider, func(t *testing.T) {
			rig := newTestRig(t)
			rig.server.chatClient.Transport = chatTransport(func(r *http.Request) (*http.Response, error) {
				if !strings.HasPrefix(r.URL.String(), chatProviders[provider]+"/") {
					t.Fatalf("unexpected destination: %s", r.URL)
				}
				var body map[string]any
				if json.NewDecoder(r.Body).Decode(&body) != nil {
					t.Fatal("invalid upstream JSON")
				}
				if body["tools"] != nil || body["tool_choice"] != nil || body["stream"] != true || body["model"] != "test-model" {
					t.Fatalf("unexpected payload: %v", body)
				}
				stream := "data: {\"choices\":[{\"delta\":{\"content\":\"Hello 🌍\"}}]}\n\ndata: [DONE]\n\n"
				if provider == "anthropic" {
					if r.URL.Path != "/v1/messages" || r.Header.Get("x-api-key") != "test-provider-secret" || r.Header.Get("anthropic-version") != "2023-06-01" || body["max_tokens"] != float64(4096) {
						t.Fatal("Claude adapter failed")
					}
					stream = "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello 🌍\"}}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
				} else if r.URL.Path != "/v1/chat/completions" || r.Header.Get("Authorization") != "Bearer test-provider-secret" {
					t.Fatal("OpenAI-compatible adapter failed")
				}
				if provider == "openai" && (body["store"] != false || body["max_completion_tokens"] != float64(4096)) {
					t.Fatal("OpenAI token/storage settings failed")
				}
				return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": {"text/event-stream"}}, Body: io.NopCloser(strings.NewReader(stream))}, nil
			})
			w := chatRequest(rig.server.Handler(), "openakita.ai", "https://openakita.ai", "completions", chatPayload(provider))
			if w.Code != 200 || !strings.Contains(w.Body.String(), `"text":"Hello 🌍"`) || !strings.Contains(w.Body.String(), `"done":true`) || !w.Flushed {
				t.Fatalf("stream failed: %d %s", w.Code, w.Body.String())
			}
			if strings.Contains(w.Body.String(), "secret") || w.Header().Get("X-Accel-Buffering") != "no" {
				t.Fatal("stream leaked credentials or enabled buffering")
			}
		})
	}
}

func TestChatRejectsUnsafePayloads(t *testing.T) {
	rig := newTestRig(t)
	rig.server.chatClient.Transport = chatTransport(func(r *http.Request) (*http.Response, error) {
		t.Fatal("invalid input reached provider")
		return nil, nil
	})
	for _, payload := range []string{
		strings.Replace(chatPayload("openai"), `"model":`, `"base_url":"http://127.0.0.1/","model":`, 1),
		strings.Replace(chatPayload("openai"), `"model":`, `"tools":[],"model":`, 1),
		strings.Replace(chatPayload("openai"), `"role":"user"`, `"role":"system"`, 1),
		strings.Replace(chatPayload("openai"), `"content":"Hello"`, `"content":""`, 1),
		strings.Replace(chatPayload("openai"), `"api_key":"test-provider-secret"`, `"api_key":""`, 1),
		chatPayload("other"), chatPayload("openai") + `{}`, `{"messages":null}`, `null`,
	} {
		w := chatRequest(rig.server.Handler(), "openakita.ai", "https://openakita.ai", "completions", payload)
		if w.Code != 400 {
			t.Fatalf("expected bad request, got %d", w.Code)
		}
	}
	w := chatRequest(rig.server.Handler(), "openakita.ai", "https://openakita.ai", "completions", `{"provider":"`+strings.Repeat("a", 513<<10)+`"}`)
	if w.Code != 413 {
		t.Fatalf("expected size limit, got %d", w.Code)
	}
}

func TestChatErrorsAndModels(t *testing.T) {
	for _, test := range []struct {
		status                    int
		stream, contentType, want string
	}{
		{401, "test-provider-secret", "application/json", "provider_auth_failed"},
		{429, "test-provider-secret", "application/json", "provider_rate_limited"},
		{400, "test-provider-secret", "application/json", "provider_request_rejected"},
		{302, "test-provider-secret", "application/json", "provider_unavailable"},
		{200, "{}", "application/json", "invalid_provider_response"},
		{200, "data: nope\n\n", "text/event-stream", "invalid_provider_response"},
		{200, "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n", "text/event-stream", "stream_interrupted"},
		{200, "data: {\"type\":\"error\",\"error\":{\"message\":\"test-provider-secret\"}}\n\n", "text/event-stream", "provider_unavailable"},
	} {
		rig := newTestRig(t)
		rig.server.chatClient.Transport = chatTransport(func(r *http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: test.status, Header: http.Header{"Content-Type": {test.contentType}}, Body: io.NopCloser(strings.NewReader(test.stream))}, nil
		})
		w := chatRequest(rig.server.Handler(), "openakita.ai", "https://openakita.ai", "completions", chatPayload("openai"))
		if !strings.Contains(w.Body.String(), test.want) || strings.Contains(w.Body.String(), "secret") || strings.Contains(w.Body.String(), `"done":true`) {
			t.Fatalf("bad error mapping: %s", w.Body.String())
		}
	}
	rig := newTestRig(t)
	rig.server.chatClient.Transport = chatTransport(func(r *http.Request) (*http.Response, error) {
		if r.Method != "GET" || r.URL.String() != "https://api.anthropic.com/v1/models" || r.Header.Get("x-api-key") != "test-provider-secret" {
			t.Fatal("model request failed")
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"data":[{"id":"claude-test"},{"id":""}]}`))}, nil
	})
	w := chatRequest(rig.server.Handler(), "openakita.ai", "https://openakita.ai", "models", `{"provider":"anthropic","api_key":"test-provider-secret"}`)
	if w.Code != 200 || w.Body.String() != "{\"models\":[\"claude-test\"]}\n" {
		t.Fatalf("models failed: %s", w.Body.String())
	}
}

func TestChatRateLimitAndCancellation(t *testing.T) {
	rig := newTestRig(t)
	for i := 0; i < 20; i++ {
		_ = chatRequest(rig.server.Handler(), "openakita.ai", "https://openakita.ai", "models", `{}`)
	}
	w := chatRequest(rig.server.Handler(), "openakita.ai", "https://openakita.ai", "models", `{}`)
	if w.Code != 429 || w.Header().Get("Retry-After") != "60" {
		t.Fatalf("chat rate limit failed: %d", w.Code)
	}
	rig = newTestRig(t)
	entered := make(chan struct{})
	canceled := make(chan struct{})
	rig.server.chatClient.Transport = chatTransport(func(r *http.Request) (*http.Response, error) {
		close(entered)
		<-r.Context().Done()
		close(canceled)
		return nil, r.Context().Err()
	})
	ctx, cancel := context.WithCancel(context.Background())
	r := httptest.NewRequest("POST", "https://openakita.ai/api/v1/chat/completions", strings.NewReader(chatPayload("openai"))).WithContext(ctx)
	r.Header.Set("Origin", "https://openakita.ai")
	r.Header.Set("Content-Type", "application/json")
	finished := make(chan struct{})
	go func() { rig.server.Handler().ServeHTTP(httptest.NewRecorder(), r); close(finished) }()
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("provider request did not start")
	}
	cancel()
	select {
	case <-canceled:
	case <-time.After(time.Second):
		t.Fatal("provider request was not canceled")
	}
	<-finished
}
