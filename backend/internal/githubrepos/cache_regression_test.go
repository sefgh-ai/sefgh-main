package githubrepos

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// Done is evaluated when get reaches its wait select. This provides a barrier
// without sleeps or adding instrumentation to the production cache.
type waitingContext struct {
	context.Context
	once    sync.Once
	waiting chan struct{}
}

func (c *waitingContext) Done() <-chan struct{} {
	c.once.Do(func() { close(c.waiting) })
	return c.Context.Done()
}

func await(t *testing.T, ch <-chan struct{}) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for test barrier")
	}
}

func TestCacheSharesUncacheableResultsWithCurrentWaiters(t *testing.T) {
	for _, status := range []int{201, 404, 429, 500, 0} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			c := newCache(8, 4096)
			started, release := make(chan struct{}), make(chan struct{})
			var releaseOnce sync.Once
			unblock := func() { releaseOnce.Do(func() { close(release) }) }
			defer unblock()
			var calls atomic.Int32
			networkErr := errors.New("offline")
			load := func(context.Context) (upstreamReply, error) {
				if calls.Add(1) == 1 {
					close(started)
				}
				<-release
				if status == 0 {
					return upstreamReply{}, networkErr
				}
				return upstreamReply{status: status, body: []byte("shared")}, nil
			}
			done := make(chan struct{}, 20)
			call := func(ctx context.Context) {
				defer func() { done <- struct{}{} }()
				reply, err := c.get(ctx, "repo", load)
				if status == 0 {
					if !errors.Is(err, networkErr) {
						t.Errorf("error = %v", err)
					}
				} else if err != nil || reply.status != status || string(reply.body) != "shared" {
					t.Errorf("reply = %+v, error = %v", reply, err)
				}
			}
			go call(context.Background())
			await(t, started)
			for range 19 {
				ctx := &waitingContext{Context: context.Background(), waiting: make(chan struct{})}
				go call(ctx)
				await(t, ctx.waiting)
			}
			unblock()
			for range 20 {
				await(t, done)
			}
			if calls.Load() != 1 {
				t.Fatalf("%d upstream calls for one in-flight result", calls.Load())
			}
			_, _ = c.get(context.Background(), "repo", load)
			if calls.Load() != 2 {
				t.Fatal("uncacheable result was persisted")
			}
		})
	}
}

func TestCacheStoresOnly200(t *testing.T) {
	for _, status := range []int{200, 201, 204, 299, 300, 404, 429, 500} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			c := newCache(4, 4096) // Every reply fits: size cannot mask status bugs.
			calls := 0
			for range 2 {
				_, _ = c.get(context.Background(), "repo", func(context.Context) (upstreamReply, error) {
					calls++
					return upstreamReply{status: status, body: []byte("small")}, nil
				})
			}
			want := 2
			if status == 200 {
				want = 1
			}
			if calls != want {
				t.Fatalf("calls = %d, want %d", calls, want)
			}
		})
	}
}

func TestCacheRefreshSurvivesCallerAndIsSingleFlightAtExactExpiry(t *testing.T) {
	c := newCache(4, 4096)
	var clock atomic.Int64
	c.now = func() time.Time { return time.Unix(clock.Load(), 0) }
	_, _ = c.get(context.Background(), "repo", func(context.Context) (upstreamReply, error) {
		return upstreamReply{status: 200, body: []byte("old")}, nil
	})
	clock.Store(3600)
	started, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	var calls atomic.Int32
	load := func(ctx context.Context) (upstreamReply, error) {
		if calls.Add(1) == 1 {
			close(started)
		}
		select {
		case <-ctx.Done():
			return upstreamReply{}, ctx.Err()
		case <-release:
		}
		if ctx.Err() != nil {
			return upstreamReply{}, ctx.Err()
		}
		return upstreamReply{status: 200, body: []byte("new")}, nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	old, err := c.get(ctx, "repo", load)
	if err != nil || string(old.body) != "old" {
		t.Fatal("did not serve stale value")
	}
	await(t, started)
	cancel()
	for range 20 {
		old, err = c.get(context.Background(), "repo", load)
		if err != nil || string(old.body) != "old" {
			t.Fatal("blocked or lost stale reply")
		}
	}
	unblock()
	waitIdle(t, c)
	updated, err := c.get(context.Background(), "repo", load)
	if err != nil || string(updated.body) != "new" || calls.Load() != 1 {
		t.Fatalf("refresh = %q, calls = %d, error = %v", updated.body, calls.Load(), err)
	}
}

func TestCacheWaiterRetriesAfterLeaderCancellation(t *testing.T) {
	c := newCache(4, 4096)
	started := make(chan struct{})
	var calls atomic.Int32
	load := func(ctx context.Context) (upstreamReply, error) {
		if calls.Add(1) == 1 {
			close(started)
			<-ctx.Done()
			return upstreamReply{}, ctx.Err()
		}
		return upstreamReply{status: 200, body: []byte("retry")}, nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	leaderDone := make(chan struct{})
	go func() {
		defer close(leaderDone)
		_, err := c.get(ctx, "repo", load)
		if !errors.Is(err, context.Canceled) {
			t.Errorf("leader error = %v", err)
		}
	}()
	await(t, started)
	waiter := &waitingContext{Context: context.Background(), waiting: make(chan struct{})}
	waiterDone := make(chan struct{})
	go func() {
		defer close(waiterDone)
		reply, err := c.get(waiter, "repo", load)
		if err != nil || string(reply.body) != "retry" {
			t.Errorf("waiter reply = %q, error = %v", reply.body, err)
		}
	}()
	await(t, waiter.waiting)
	cancel()
	await(t, leaderDone)
	await(t, waiterDone)
	if calls.Load() != 2 {
		t.Fatalf("calls = %d", calls.Load())
	}
}

func TestCachePanicReleasesWaitersAndAllowsRecovery(t *testing.T) {
	c := newCache(4, 4096)
	started, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	load := func(context.Context) (upstreamReply, error) {
		close(started)
		<-release
		panic("not safe to log")
	}
	done := make(chan struct{}, 2)
	call := func(ctx context.Context) {
		defer func() { done <- struct{}{} }()
		_, err := c.get(ctx, "repo", load)
		if err == nil {
			t.Error("panic must become an error")
		}
	}
	go call(context.Background())
	await(t, started)
	waiter := &waitingContext{Context: context.Background(), waiting: make(chan struct{})}
	go call(waiter)
	await(t, waiter.waiting)
	unblock()
	await(t, done)
	await(t, done)
	waitIdle(t, c)
	reply, err := c.get(context.Background(), "repo", func(context.Context) (upstreamReply, error) {
		return upstreamReply{status: 200, body: []byte("recovered")}, nil
	})
	if err != nil || string(reply.body) != "recovered" {
		t.Fatal("panic stranded key")
	}
}

func TestCacheBackgroundPanicKeepsStaleEntryAndAllowsRetry(t *testing.T) {
	c := newCache(4, 4096)
	var clock atomic.Int64
	c.now = func() time.Time { return time.Unix(clock.Load(), 0) }
	load := func(context.Context) (upstreamReply, error) {
		return upstreamReply{status: 200, body: []byte("old")}, nil
	}
	_, _ = c.get(context.Background(), "repo", load)
	clock.Store(3600)
	_, _ = c.get(context.Background(), "repo", func(context.Context) (upstreamReply, error) { panic("refresh panic") })
	waitIdle(t, c)
	old, err := c.get(context.Background(), "repo", func(context.Context) (upstreamReply, error) {
		return upstreamReply{status: 200, body: []byte("new")}, nil
	})
	if err != nil || string(old.body) != "old" {
		t.Fatal("panic discarded stale entry")
	}
	waitIdle(t, c)
	updated, err := c.get(context.Background(), "repo", load)
	if err != nil || string(updated.body) != "new" {
		t.Fatal("cannot refresh after panic")
	}
}

func TestCacheEvictsOldestStoredNotNewestOrRecentlyRead(t *testing.T) {
	for _, limits := range [][2]int{{2, 4096}, {10, 4}} {
		c := newCache(limits[0], limits[1])
		now := time.Unix(0, 0)
		c.now = func() time.Time { return now }
		load := func(context.Context) (upstreamReply, error) {
			return upstreamReply{status: 200, body: []byte("x")}, nil
		}
		for _, key := range []string{"a", "b", "a", "c"} {
			_, _ = c.get(context.Background(), key, load)
			now = now.Add(time.Second)
		}
		if _, exists := c.entries["a"]; exists {
			t.Fatal("oldest stored entry retained")
		}
		if _, exists := c.entries["b"]; !exists {
			t.Fatal("newer entry evicted")
		}
		if _, exists := c.entries["c"]; !exists {
			t.Fatal("new entry not stored")
		}
	}
}
