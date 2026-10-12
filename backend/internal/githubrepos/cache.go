package githubrepos

import (
	"context"
	"sync"
	"time"
)

type cacheEntry struct {
	reply upstreamReply
	saved time.Time
	size  int
}
type repoCache struct {
	mu         sync.Mutex
	entries    map[string]cacheEntry
	pending    map[string]chan struct{}
	bytes      int
	maxEntries int
	maxBytes   int
	now        func() time.Time
}

func newCache(maxEntries, maxBytes int) *repoCache {
	return &repoCache{entries: map[string]cacheEntry{}, pending: map[string]chan struct{}{}, maxEntries: maxEntries, maxBytes: maxBytes, now: time.Now}
}

// get implements one-hour freshness followed by stale-while-revalidate.
// Values are immutable after publication. Never hold the mutex during I/O.
func (c *repoCache) get(ctx context.Context, key string, load func(context.Context) (upstreamReply, error)) (upstreamReply, error) {
	for {
		c.mu.Lock()
		entry, found := c.entries[key]
		done, running := c.pending[key]
		if found {
			if c.now().Sub(entry.saved) >= time.Hour && !running {
				done = make(chan struct{})
				c.pending[key] = done
				go func() {
					// A stale refresh belongs to the cache, not to the caller who has
					// already received the old value. Still bound its lifetime.
					refreshCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), upstreamTimeout)
					defer cancel()
					_, _ = c.fill(refreshCtx, key, load, done)
				}()
			}
			c.mu.Unlock()
			return entry.reply, nil
		}
		if running {
			c.mu.Unlock()
			select {
			case <-done:
				continue
			case <-ctx.Done():
				return upstreamReply{}, ctx.Err()
			}
		}
		done = make(chan struct{})
		c.pending[key] = done
		c.mu.Unlock()
		return c.fill(ctx, key, load, done)
	}
}

func (c *repoCache) fill(ctx context.Context, key string, load func(context.Context) (upstreamReply, error), done chan struct{}) (upstreamReply, error) {
	result, err := load(ctx)
	c.mu.Lock()
	defer c.mu.Unlock()
	defer close(done)
	delete(c.pending, key)
	// Next's fetch cache stores status 200 responses, before parsing JSON.
	// Errors leave any stale entry intact for the next refresh attempt.
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
