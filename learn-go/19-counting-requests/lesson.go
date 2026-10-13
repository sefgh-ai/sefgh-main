package lesson19

import (
	"sync"
	"time"
)

// counter allows limit requests per key in any window. It is the real
// Limiter in backend/internal/ailimit without the waiting time and without
// forgetting callers.
type counter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	times  map[string][]time.Time // per key, oldest first
}

func newCounter(limit int, window time.Duration) *counter {
	return &counter{limit: limit, window: window, times: map[string][]time.Time{}}
}
