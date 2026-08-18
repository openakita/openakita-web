package securestore

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var ErrNotFound = errors.New("secure store value not found")

type Store interface {
	PutState(context.Context, string, []byte, time.Duration) error
	ConsumeState(context.Context, string) ([]byte, error)
	PutSession(context.Context, string, []byte, time.Duration) error
	GetSession(context.Context, string) ([]byte, error)
	DeleteSession(context.Context, string) error
	AcquireRefreshLock(context.Context, string, time.Duration) (string, bool, error)
	ReleaseRefreshLock(context.Context, string, string) error
	AllowFixedWindow(context.Context, string, int, time.Duration) (int, bool, error)
	Ping(context.Context) error
	Close() error
}

type RedisStore struct {
	client *redis.Client
}

func NewRedis(rawURL string) (*RedisStore, error) {
	options, err := redis.ParseURL(rawURL)
	if err != nil {
		return nil, err
	}
	return &RedisStore{client: redis.NewClient(options)}, nil
}

func (s *RedisStore) PutState(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	return s.client.Set(ctx, "oa:web:state:"+key, value, ttl).Err()
}

func (s *RedisStore) ConsumeState(ctx context.Context, key string) ([]byte, error) {
	value, err := s.client.GetDel(ctx, "oa:web:state:"+key).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, ErrNotFound
	}
	return value, err
}

func (s *RedisStore) PutSession(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	return s.client.Set(ctx, "oa:web:session:"+key, value, ttl).Err()
}

func (s *RedisStore) GetSession(ctx context.Context, key string) ([]byte, error) {
	value, err := s.client.Get(ctx, "oa:web:session:"+key).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, ErrNotFound
	}
	return value, err
}

func (s *RedisStore) DeleteSession(ctx context.Context, key string) error {
	return s.client.Del(ctx, "oa:web:session:"+key).Err()
}

func (s *RedisStore) AcquireRefreshLock(ctx context.Context, key string, ttl time.Duration) (string, bool, error) {
	token, err := randomToken(24)
	if err != nil {
		return "", false, err
	}
	ok, err := s.client.SetNX(ctx, "oa:web:refresh:"+key, token, ttl).Result()
	return token, ok, err
}

func (s *RedisStore) ReleaseRefreshLock(ctx context.Context, key, token string) error {
	const script = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`
	return s.client.Eval(ctx, script, []string{"oa:web:refresh:" + key}, token).Err()
}

func (s *RedisStore) AllowFixedWindow(ctx context.Context, key string, limit int, window time.Duration) (int, bool, error) {
	const script = `local current = redis.call("INCR", KEYS[1]); if current == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end; return current`
	current, err := s.client.Eval(ctx, script, []string{"oa:web:ratelimit:" + key}, window.Milliseconds()).Int64()
	if err != nil {
		return 0, false, err
	}
	remaining := limit - int(current)
	if remaining < 0 {
		remaining = 0
	}
	return remaining, current <= int64(limit), nil
}

func (s *RedisStore) Ping(ctx context.Context) error { return s.client.Ping(ctx).Err() }
func (s *RedisStore) Close() error                   { return s.client.Close() }

type memoryItem struct {
	value   []byte
	expires time.Time
}

type MemoryStore struct {
	mu       sync.Mutex
	states   map[string]memoryItem
	sessions map[string]memoryItem
	locks    map[string]memoryItem
	counters map[string]memoryCounter
}

type memoryCounter struct {
	count   int
	expires time.Time
}

func NewMemory() *MemoryStore {
	return &MemoryStore{
		states: map[string]memoryItem{}, sessions: map[string]memoryItem{}, locks: map[string]memoryItem{},
		counters: map[string]memoryCounter{},
	}
}

func (s *MemoryStore) PutState(_ context.Context, key string, value []byte, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.states[key] = memoryItem{append([]byte(nil), value...), time.Now().Add(ttl)}
	return nil
}

func (s *MemoryStore) ConsumeState(_ context.Context, key string) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.states[key]
	delete(s.states, key)
	if !ok || time.Now().After(item.expires) {
		return nil, ErrNotFound
	}
	return append([]byte(nil), item.value...), nil
}

func (s *MemoryStore) PutSession(_ context.Context, key string, value []byte, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[key] = memoryItem{append([]byte(nil), value...), time.Now().Add(ttl)}
	return nil
}

func (s *MemoryStore) GetSession(_ context.Context, key string) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.sessions[key]
	if !ok || time.Now().After(item.expires) {
		delete(s.sessions, key)
		return nil, ErrNotFound
	}
	return append([]byte(nil), item.value...), nil
}

func (s *MemoryStore) DeleteSession(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, key)
	return nil
}

func (s *MemoryStore) AcquireRefreshLock(_ context.Context, key string, ttl time.Duration) (string, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if item, ok := s.locks[key]; ok && time.Now().Before(item.expires) {
		return "", false, nil
	}
	token, err := randomToken(24)
	if err != nil {
		return "", false, err
	}
	s.locks[key] = memoryItem{[]byte(token), time.Now().Add(ttl)}
	return token, true, nil
}

func (s *MemoryStore) ReleaseRefreshLock(_ context.Context, key, token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if item, ok := s.locks[key]; ok && string(item.value) == token {
		delete(s.locks, key)
	}
	return nil
}

func (s *MemoryStore) AllowFixedWindow(_ context.Context, key string, limit int, window time.Duration) (int, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	counter, ok := s.counters[key]
	if !ok || !counter.expires.After(now) {
		counter = memoryCounter{expires: now.Add(window)}
	}
	counter.count++
	s.counters[key] = counter
	remaining := limit - counter.count
	if remaining < 0 {
		remaining = 0
	}
	return remaining, counter.count <= limit, nil
}

func (s *MemoryStore) Ping(context.Context) error { return nil }
func (s *MemoryStore) Close() error               { return nil }

func randomToken(size int) (string, error) {
	value := make([]byte, size)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}
