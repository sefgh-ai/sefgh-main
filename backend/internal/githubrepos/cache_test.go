package githubrepos

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestCacheFreshStaleAndRecovery(t *testing.T) {
	c := newCache(2, 1024)
	now := time.Unix(0, 0)
	c.now = func() time.Time { return now }
	var calls atomic.Int32
	refreshed := make(chan struct{})
	load := func(context.Context) (upstreamReply, error) {
		n := calls.Add(1)
		if n == 2 {
			defer close(refreshed)
			return upstreamReply{}, errors.New("offline")
		}
		return upstreamReply{status: 200, body: []byte{byte(n)}}, nil
	}
	first, err := c.get(context.Background(), "repo", load)
	if err != nil {
		t.Fatal(err)
	}
	fresh, _ := c.get(context.Background(), "repo", load)
	if fresh.body[0] != first.body[0] || calls.Load() != 1 {
		t.Fatal("fresh entry was not reused")
	}
	now = now.Add(time.Hour + time.Second)
	stale, err := c.get(context.Background(), "repo", load)
	if err != nil || stale.body[0] != 1 {
		t.Fatal("stale value must be returned during revalidation")
	}
	select {
	case <-refreshed:
	case <-time.After(time.Second):
		t.Fatal("no background refresh")
	}
	waitIdle(t, c)
	stillStale, _ := c.get(context.Background(), "repo", load)
	if stillStale.body[0] != 1 {
		t.Fatal("failed refresh discarded old value")
	}
	waitIdle(t, c)
	updated, _ := c.get(context.Background(), "repo", load)
	if updated.body[0] != 3 || calls.Load() != 3 {
		t.Fatal("successful refresh not cached")
	}
}

func waitIdle(t *testing.T, c *repoCache) {
	t.Helper()
	c.mu.Lock()
	var done chan struct{}
	for _, ch := range c.pending {
		done = ch.done
		break
	}
	c.mu.Unlock()
	if done != nil {
		select {
		case <-done:
		case <-time.After(time.Second):
			t.Fatal("cache load stuck")
		}
	}
}

func TestCacheCoalescesMissesAndWaitersCanCancel(t *testing.T) {
	c := newCache(2, 1024)
	started := make(chan struct{})
	release := make(chan struct{})
	var calls atomic.Int32
	load := func(context.Context) (upstreamReply, error) {
		calls.Add(1)
		close(started)
		<-release
		return upstreamReply{status: 200, body: []byte("ok")}, nil
	}
	var group sync.WaitGroup
	group.Add(1)
	go func() { defer group.Done(); _, _ = c.get(context.Background(), "x", load) }()
	<-started
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := c.get(ctx, "x", load); !errors.Is(err, context.Canceled) {
		t.Errorf("waiter error %v", err)
	}
	group.Add(1)
	go func() { defer group.Done(); _, _ = c.get(context.Background(), "x", load) }()
	close(release)
	group.Wait()
	if calls.Load() != 1 {
		t.Fatalf("%d duplicate loads", calls.Load())
	}
}

func TestCacheBoundsMemory(t *testing.T) {
	c := newCache(2, 4)
	load := func(context.Context) (upstreamReply, error) {
		return upstreamReply{status: 200, body: []byte("abc")}, nil
	}
	for _, key := range []string{"a", "b", "c"} {
		_, _ = c.get(context.Background(), key, load)
	}
	if c.bytes > 4 || len(c.entries) > 2 {
		t.Fatal("unbounded cache")
	}
	if _, ok := c.entries["c"]; !ok {
		t.Fatal("new entry missing")
	}
	tooLarge := func(context.Context) (upstreamReply, error) {
		return upstreamReply{status: 200, body: []byte("large")}, nil
	}
	_, _ = c.get(context.Background(), "big", tooLarge)
	if _, ok := c.entries["big"]; ok {
		t.Fatal("oversized entry stored")
	}
}
