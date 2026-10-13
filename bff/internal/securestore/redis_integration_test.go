package securestore

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"
)

func TestRedisFixedWindowIntegration(t *testing.T) {
	rawURL := os.Getenv("WEB_BFF_TEST_REDIS_URL")
	if rawURL == "" {
		t.Skip("WEB_BFF_TEST_REDIS_URL is not configured")
	}
	store, err := NewRedis(rawURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	key := fmt.Sprintf("integration-%d", time.Now().UnixNano())
	t.Cleanup(func() {
		_ = store.client.Del(context.Background(), "oa:web:ratelimit:"+key).Err()
	})

	for request := 1; request <= 3; request++ {
		remaining, allowed, err := store.AllowFixedWindow(ctx, key, 2, time.Minute)
		if err != nil {
			t.Fatal(err)
		}
		if allowed != (request <= 2) {
			t.Fatalf("request %d allowed = %v, remaining = %d", request, allowed, remaining)
		}
	}
}
