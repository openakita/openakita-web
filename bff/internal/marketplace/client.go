package marketplace

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type RecentResource struct {
	ResourceID   string    `json:"resource_id"`
	Slug         string    `json:"slug"`
	Name         string    `json:"name"`
	ResourceType string    `json:"resource_type"`
	IconURL      *string   `json:"icon_url"`
	AcquiredAt   time.Time `json:"acquired_at"`
}

type LibrarySummary struct {
	AccountSubject       string           `json:"account_sub"`
	AcquiredCount        int              `json:"acquired_count"`
	UpdateAvailableCount int              `json:"update_available_count"`
	Recent               []RecentResource `json:"recent"`
	GeneratedAt          time.Time        `json:"generated_at"`
}

type Provider interface {
	LibrarySummary(context.Context, string, int, string) (LibrarySummary, error)
}

type Client struct {
	baseURL    *url.URL
	machineID  string
	secret     string
	httpClient *http.Client
}

type HTTPError struct{ Status int }

func (e *HTTPError) Error() string {
	return fmt.Sprintf("Marketplace endpoint returned status %d", e.Status)
}

func New(baseURL *url.URL, machineID, secret string, httpClient *http.Client) (*Client, error) {
	if baseURL == nil || !baseURL.IsAbs() || baseURL.Host == "" || !strings.HasSuffix(baseURL.Path, "/") {
		return nil, errors.New("Marketplace base URL must be absolute and end with /")
	}
	if machineID == "" || secret == "" {
		return nil, errors.New("Marketplace machine credentials are required")
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 3 * time.Second}
	}
	copyURL := *baseURL
	return &Client{baseURL: &copyURL, machineID: machineID, secret: secret, httpClient: httpClient}, nil
}

func (c *Client) LibrarySummary(ctx context.Context, subject string, recentLimit int, requestID string) (LibrarySummary, error) {
	if strings.TrimSpace(subject) == "" || recentLimit < 0 || recentLimit > 5 {
		return LibrarySummary{}, errors.New("invalid Marketplace summary request")
	}
	endpoint := c.baseURL.ResolveReference(&url.URL{Path: "api/v1/service/users/" + url.PathEscape(subject) + "/library-summary"})
	query := endpoint.Query()
	query.Set("recent_limit", strconv.Itoa(recentLimit))
	endpoint.RawQuery = query.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return LibrarySummary{}, err
	}
	request.SetBasicAuth(c.machineID, c.secret)
	request.Header.Set("Accept", "application/json")
	if requestID != "" {
		request.Header.Set("X-Request-ID", requestID)
	}
	response, err := c.httpClient.Do(request)
	if err != nil {
		return LibrarySummary{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 64<<10))
		return LibrarySummary{}, &HTTPError{Status: response.StatusCode}
	}
	var summary LibrarySummary
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&summary); err != nil {
		return LibrarySummary{}, errors.New("invalid Marketplace summary response")
	}
	if summary.AccountSubject != subject || summary.AcquiredCount < 0 || summary.UpdateAvailableCount < 0 || len(summary.Recent) > recentLimit || summary.GeneratedAt.IsZero() {
		return LibrarySummary{}, errors.New("inconsistent Marketplace summary response")
	}
	for _, item := range summary.Recent {
		if item.ResourceID == "" || item.Slug == "" || item.Name == "" || item.ResourceType == "" || item.AcquiredAt.IsZero() {
			return LibrarySummary{}, errors.New("incomplete Marketplace recent resource")
		}
	}
	return summary, nil
}
