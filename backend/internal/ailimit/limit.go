// Package ailimit holds the limits the owner approved for the AI routes on
// 2026-10-13, and the counter that enforces the per-caller allowance. It is
// the Go counterpart of src/lib/ai/guard.js and must answer the same way.
package ailimit

import (
	"container/list"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// Starting values, to be adjusted from real use. "Characters" are UTF-16
// units, which is what a JavaScript string length counts.
const (
	Requests        = 30
	Window          = 5 * time.Minute
	ChatMessages    = 20
	ChatCharacters  = 8000
	QueryCharacters = 500
	defaultMaxKeys  = 10000
)

// Limiter counts requests per key inside a moving window.
//
// The count lives in this process. Another instance has its own, and a
// restart forgets it, so it slows a caller down; it is not an account
// balance. A shared counter needs a store and is a later step.
type Limiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	maxKeys int
	callers map[string]*list.Element // key -> its place in recency
	recency *list.List               // of *caller, least recently seen first
}

type caller struct {
	key   string
	times []time.Time // oldest first
}

// New makes a limiter that allows limit requests per key in any window.
func New(limit int, window time.Duration) *Limiter {
	return &Limiter{limit: limit, window: window, maxKeys: defaultMaxKeys, callers: map[string]*list.Element{}, recency: list.New()}
}

// Take records one request for key at the moment now and returns 0, or
// refuses it and returns how many seconds the caller should wait. A refused
// request is not counted.
func (l *Limiter) Take(key string, now time.Time) int {
	l.mu.Lock()
	defer l.mu.Unlock()
	var c *caller
	if element, known := l.callers[key]; known {
		c = element.Value.(*caller)
		// Seen again, so this caller is now the most recently seen.
		l.recency.MoveToBack(element)
	} else {
		c = &caller{key: key}
		l.callers[key] = l.recency.PushBack(c)
	}
	// Keep only the requests still inside the window.
	cutoff := now.Add(-l.window)
	kept := c.times[:0]
	for _, at := range c.times {
		if at.After(cutoff) {
			kept = append(kept, at)
		}
	}
	c.times = kept
	if len(c.times) >= l.limit {
		wait := c.times[0].Add(l.window).Sub(now)
		seconds := int((wait + time.Second - 1) / time.Second) // round up
		if seconds < 1 {
			seconds = 1
		}
		return seconds
	}
	c.times = append(c.times, now)
	if len(l.callers) > l.maxKeys {
		// Forget the caller unused for longest, so memory stays bounded.
		oldest := l.recency.Front()
		delete(l.callers, oldest.Value.(*caller).key)
		l.recency.Remove(oldest)
	}
	return 0
}

// ClientAddress is the address the hosting platform reports for the caller:
// the first entry of X-Forwarded-For, or "unknown". It is only as
// trustworthy as the proxy in front of this server.
func ClientAddress(r *http.Request) string {
	forwarded := strings.Join(r.Header.Values("X-Forwarded-For"), ", ")
	first, _, _ := strings.Cut(forwarded, ",")
	if address := jscompat.Trim(first); address != "" {
		return address
	}
	return "unknown"
}
