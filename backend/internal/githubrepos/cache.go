package githubrepos

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"
)

type cacheEntry struct {
	reply upstreamReply
	saved time.Time
	size  int
}

// Fields are published before done closes and are immutable afterwards.
// A flight shares even an uncacheable result with its existing waiters.
type cacheFlight struct {
	done  chan struct{}
	reply upstreamReply
	err   error
	retry bool
}

type repoCache struct {
	mu         sync.Mutex
	entries    map[string]cacheEntry
	pending    map[string]*cacheFlight
	bytes      int
	maxEntries int
	maxBytes   int
	now        func() time.Time
	logPanic   func()
}

func newCache(maxEntries, maxBytes int) *repoCache {
	return &repoCache{entries: map[string]cacheEntry{}, pending: map[string]*cacheFlight{}, maxEntries: maxEntries, maxBytes: maxBytes, now: time.Now, logPanic: func() { slog.Error("repository cache loader panicked") }}
}

// FreshFor is how long a cached repository is served without asking GitHub
// again: ten minutes since R-034 (the Next.js handler's revalidate is an
// hour). Only signed-out reads use the cache.
const FreshFor = 10 * time.Minute

// get implements FreshFor freshness followed by stale-while-revalidate.
// Values are immutable after publication. Never hold the mutex during I/O.
func (c *repoCache) get(ctx context.Context, key string, load func(context.Context) (upstreamReply, error)) (upstreamReply, error) {
	for {
		if err := ctx.Err(); err != nil {
			return upstreamReply{}, err
		}
		c.mu.Lock()
		entry, found := c.entries[key]
		flight, running := c.pending[key]
		if found {
			if c.now().Sub(entry.saved) >= FreshFor && !running {
				flight = &cacheFlight{done: make(chan struct{})}
				c.pending[key] = flight
				go func() {
					// A stale refresh belongs to the cache, not to the caller who has
					// already received the old value. Still bound its lifetime.
					refreshCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), upstreamTimeout)
					defer cancel()
					_, _ = c.fill(refreshCtx, key, load, flight)
				}()
			}
			c.mu.Unlock()
			return entry.reply, nil
		}
		if running {
			c.mu.Unlock()
			select {
			case <-flight.done:
				if err := ctx.Err(); err != nil {
					return upstreamReply{}, err
				}
				if flight.retry {
					continue
				}
				return flight.reply, flight.err
			case <-ctx.Done():
				return upstreamReply{}, ctx.Err()
			}
		}
		flight = &cacheFlight{done: make(chan struct{})}
		c.pending[key] = flight
		c.mu.Unlock()
		return c.fill(ctx, key, load, flight)
	}
}

func (c *repoCache) fill(ctx context.Context, key string, load func(context.Context) (upstreamReply, error), flight *cacheFlight) (result upstreamReply, err error) {
	// Install cleanup before calling user code. Recover here for both foreground
	// and background loads, so a panic cannot strand waiters or kill the server.
	defer func() {
		panicked := recover() != nil
		if panicked {
			result = upstreamReply{}
			err = errors.New("repository cache loader panicked")
		}
		c.mu.Lock()
		flight.reply, flight.err = result, err
		flight.retry = ctx.Err() != nil && !panicked
		delete(c.pending, key)
		close(flight.done)
		c.mu.Unlock()
		if panicked {
			// Never log the key or arbitrary panic value.
			c.logPanic()
		}
	}()
	result, err = load(ctx)
	c.mu.Lock()
	defer c.mu.Unlock()
	// A 404 means the repository is gone or no longer public: stop serving
	// the copy (R-034). Without this the stale copy outlived every refresh.
	if old, exists := c.entries[key]; exists && err == nil && result.status == 404 {
		c.bytes -= old.size
		delete(c.entries, key)
	}
	// Next's fetch cache stores status 200 responses, before parsing JSON.
	// Other failures leave any stale entry intact for the next refresh
	// attempt, so a GitHub outage does not empty the page.
	if err == nil && result.status == 200 {
		size := len(key) + len(result.body)
		for k, values := range result.header {
			size += len(k)
			for _, v := range values {
				size += len(v)
			}
		}
		if size <= c.maxBytes && c.maxEntries > 0 {
			if old, exists := c.entries[key]; exists {
				c.bytes -= old.size
				delete(c.entries, key)
			}
			for len(c.entries) >= c.maxEntries || c.bytes+size > c.maxBytes {
				oldest := ""
				var saved time.Time
				for k, e := range c.entries {
					if oldest == "" || e.saved.Before(saved) {
						oldest = k
						saved = e.saved
					}
				}
				c.bytes -= c.entries[oldest].size
				delete(c.entries, oldest)
			}
			c.entries[key] = cacheEntry{result, c.now(), size}
			c.bytes += size
		}
	}
	return result, err
}
