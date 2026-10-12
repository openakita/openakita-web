package web

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Destinations are server-owned. Never proxy a URL supplied by a browser.
var chatProviders = map[string]string{
	"openai":    "https://api.openai.com/v1",
	"anthropic": "https://api.anthropic.com/v1",
	"xai":       "https://api.x.ai/v1",
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatInput struct {
	Provider string        `json:"provider"`
	APIKey   string        `json:"api_key"`
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

func (s *Server) chatOrigin(request *http.Request) string {
	host := strings.ToLower(request.Host)
	if host == "openakita.ai" || host == "www.openakita.ai" {
		return "https://" + host
	}
	if s.cfg.Environment == "development" {
		parsed, err := url.Parse("http://" + host)
		if err == nil && (parsed.Hostname() == "localhost" || parsed.Hostname() == "127.0.0.1" || parsed.Hostname() == "::1") && parsed.Host == host {
			return "http://" + host
		}
	}
	return ""
}

func (s *Server) handleChatCapabilities(w http.ResponseWriter, r *http.Request) {
	if s.chatOrigin(r) == "" {
		writeError(w, http.StatusNotFound, "chat_unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"enabled": true, "providers": []string{"openai", "anthropic", "xai"}})
}

func (s *Server) readChatInput(w http.ResponseWriter, r *http.Request, completion bool) (chatInput, bool) {
	var input chatInput
	origin := s.chatOrigin(r)
	if origin == "" {
		writeError(w, http.StatusNotFound, "chat_unavailable")
		return input, false
	}
	if r.Header.Get("Origin") != origin || r.Header.Get("Sec-Fetch-Site") == "cross-site" {
		writeError(w, http.StatusForbidden, "invalid_origin")
		return input, false
	}
	if strings.Split(r.Header.Get("Content-Type"), ";")[0] != "application/json" {
		writeError(w, http.StatusUnsupportedMediaType, "json_required")
		return input, false
	}
	r.Body = http.MaxBytesReader(w, r.Body, 512<<10)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		var sizeError *http.MaxBytesError
		if errors.As(err, &sizeError) {
			writeError(w, http.StatusRequestEntityTooLarge, "conversation_too_large")
		} else {
			writeError(w, http.StatusBadRequest, "invalid_request")
		}
		return input, false
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid_request")
		return input, false
	}
	input.APIKey = strings.TrimSpace(input.APIKey)
	input.Model = strings.TrimSpace(input.Model)
	if chatProviders[input.Provider] == "" || len(input.APIKey) < 1 || len(input.APIKey) > 4096 || strings.ContainsAny(input.APIKey, "\r\n\x00") {
		writeError(w, http.StatusBadRequest, "invalid_endpoint")
		return input, false
	}
	if completion {
		if len(input.Model) < 1 || len(input.Model) > 200 || len(input.Messages) < 1 || len(input.Messages) > 100 || input.Messages[len(input.Messages)-1].Role != "user" {
			writeError(w, http.StatusBadRequest, "invalid_conversation")
			return input, false
		}
		for i, message := range input.Messages {
			expectedRole := "user"
			if i%2 == 1 {
				expectedRole = "assistant"
			}
			if message.Role != expectedRole || strings.TrimSpace(message.Content) == "" || len(message.Content) > 64000 {
				writeError(w, http.StatusBadRequest, "invalid_conversation")
				return input, false
			}
		}
	}
	return input, true
}

func (s *Server) chatUpstream(ctx context.Context, input chatInput, path string, body []byte) (*http.Response, error) {
	method := http.MethodPost
	if body == nil {
		method = http.MethodGet
	}
	request, err := http.NewRequestWithContext(ctx, method, chatProviders[input.Provider]+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	if input.Provider == "anthropic" {
		request.Header.Set("x-api-key", input.APIKey)
		request.Header.Set("anthropic-version", "2023-06-01")
	} else {
		request.Header.Set("Authorization", "Bearer "+input.APIKey)
	}
	return s.chatClient.Do(request)
}

// Do not echo provider bodies: they can contain credentials or user content.
func chatUpstreamError(w http.ResponseWriter, status int) {
	switch status {
	case 401, 403:
		writeError(w, http.StatusBadRequest, "provider_auth_failed")
	case 429:
		writeError(w, http.StatusTooManyRequests, "provider_rate_limited")
	case 400, 404, 422:
		writeError(w, http.StatusBadRequest, "provider_request_rejected")
	default:
		writeError(w, http.StatusBadGateway, "provider_unavailable")
	}
}

func (s *Server) handleChatModels(w http.ResponseWriter, r *http.Request) {
	input, ok := s.readChatInput(w, r, false)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	upstream, err := s.chatUpstream(ctx, input, "/models", nil)
	if err != nil {
		writeError(w, http.StatusBadGateway, "provider_unavailable")
		return
	}
	defer upstream.Body.Close()
	if upstream.StatusCode != http.StatusOK {
		chatUpstreamError(w, upstream.StatusCode)
		return
	}
	var models struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if json.NewDecoder(io.LimitReader(upstream.Body, 1<<20)).Decode(&models) != nil {
		writeError(w, http.StatusBadGateway, "invalid_provider_response")
		return
	}
	ids := make([]string, 0, len(models.Data))
	for _, model := range models.Data {
		if len(model.ID) > 0 && len(model.ID) <= 200 && len(ids) < 1000 {
			ids = append(ids, model.ID)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"models": ids})
}

func (s *Server) handleChatCompletion(w http.ResponseWriter, r *http.Request) {
	input, ok := s.readChatInput(w, r, true)
	if !ok {
		return
	}
	// The general server has a 10s write timeout. Extend this request only.
	controller := http.NewResponseController(w)
	_ = controller.SetWriteDeadline(time.Now().Add(185 * time.Second))
	ctx, cancel := context.WithTimeout(r.Context(), 180*time.Second)
	defer cancel()
	payload := map[string]any{"model": input.Model, "messages": input.Messages, "stream": true}
	path := "/chat/completions"
	if input.Provider == "anthropic" {
		path = "/messages"
		payload["max_tokens"] = 4096
	} else if input.Provider == "openai" {
		payload["max_completion_tokens"] = 4096
		payload["store"] = false
	} else {
		payload["max_tokens"] = 4096
	}
	body, _ := json.Marshal(payload)
	upstream, err := s.chatUpstream(ctx, input, path, body)
	if err != nil {
		writeError(w, http.StatusBadGateway, "provider_unavailable")
		return
	}
	defer upstream.Body.Close()
	if upstream.StatusCode != http.StatusOK {
		chatUpstreamError(w, upstream.StatusCode)
		return
	}
	if !strings.HasPrefix(upstream.Header.Get("Content-Type"), "text/event-stream") {
		writeError(w, http.StatusBadGateway, "invalid_provider_response")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	_ = controller.Flush()
	emit := func(value any) bool {
		encoded, _ := json.Marshal(value)
		if _, err := w.Write(append(append([]byte("data: "), encoded...), '\n', '\n')); err != nil {
			return false
		}
		return controller.Flush() == nil
	}
	scanner := bufio.NewScanner(io.LimitReader(upstream.Body, 8<<20))
	scanner.Buffer(make([]byte, 4096), 1<<20)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			emit(map[string]any{"done": true})
			return
		}
		var event struct {
			Type  string          `json:"type"`
			Error json.RawMessage `json:"error"`
			Delta struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"delta"`
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if json.Unmarshal([]byte(data), &event) != nil {
			emit(map[string]string{"error": "invalid_provider_response"})
			return
		}
		if event.Type == "error" || len(event.Error) > 0 && string(event.Error) != "null" {
			emit(map[string]string{"error": "provider_unavailable"})
			return
		}
		if input.Provider == "anthropic" {
			if event.Type == "message_stop" {
				emit(map[string]any{"done": true})
				return
			}
			if event.Type == "content_block_delta" && event.Delta.Type == "text_delta" && event.Delta.Text != "" {
				if !emit(map[string]string{"text": event.Delta.Text}) {
					return
				}
			}
		} else if len(event.Choices) > 0 && event.Choices[0].Delta.Content != "" {
			if !emit(map[string]string{"text": event.Choices[0].Delta.Content}) {
				return
			}
		}
	}
	// A missing terminator is an interrupted response, even when EOF is clean.
	emit(map[string]string{"error": "stream_interrupted"})
}
