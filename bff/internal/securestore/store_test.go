package securestore

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestMemoryStateIsConsumedExactlyOnce(t *testing.T) {
	store := NewMemory()
	if err := store.PutState(context.Background(), "state", []byte("value"), time.Minute); err != nil {
		t.Fatal(err)
	}
	value, err := store.ConsumeState(context.Background(), "state")
	if err != nil || string(value) != "value" {
		t.Fatalf("first consume = %q, %v", value, err)
	}
	if _, err := store.ConsumeState(context.Background(), "state"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("second consume error = %v", err)
	}
}

func TestMemoryRefreshLockIsOwned(t *testing.T) {
	store := NewMemory()
	token, acquired, err := store.AcquireRefreshLock(context.Background(), "session", time.Minute)
	if err != nil || !acquired {
		t.Fatalf("acquire = %q, %v, %v", token, acquired, err)
	}
	if _, acquired, _ := store.AcquireRefreshLock(context.Background(), "session", time.Minute); acquired {
		t.Fatal("second caller unexpectedly acquired active lock")
	}
	_ = store.ReleaseRefreshLock(context.Background(), "session", "wrong-owner")
	if _, acquired, _ := store.AcquireRefreshLock(context.Background(), "session", time.Minute); acquired {
		t.Fatal("wrong owner released lock")
	}
	_ = store.ReleaseRefreshLock(context.Background(), "session", token)
	if _, acquired, _ := store.AcquireRefreshLock(context.Background(), "session", time.Minute); !acquired {
		t.Fatal("owner did not release lock")
	}
}

func TestMemoryFixedWindowRateLimit(t *testing.T) {
	store := NewMemory()
	for expectedRemaining := 1; expectedRemaining >= 0; expectedRemaining-- {
		remaining, allowed, err := store.AllowFixedWindow(context.Background(), "client", 2, time.Minute)
		if err != nil || !allowed || remaining != expectedRemaining {
			t.Fatalf("allowed call = remaining %d allowed %v error %v", remaining, allowed, err)
		}
	}
	remaining, allowed, err := store.AllowFixedWindow(context.Background(), "client", 2, time.Minute)
	if err != nil || allowed || remaining != 0 {
		t.Fatalf("limited call = remaining %d allowed %v error %v", remaining, allowed, err)
	}
}
