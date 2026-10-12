package lesson10

import (
	"sync"
	"testing"
	"time"
)

func TestState(t *testing.T) {
	saved := time.Unix(100, 0)
	c := &cache{saved: map[string]time.Time{"repo": saved}}
	for _, tc := range []struct {
		key  string
		age  time.Duration
		want string
	}{{"missing", 0, "miss"}, {"repo", 0, "fresh"}, {"repo", time.Hour - time.Nanosecond, "fresh"}, {"repo", time.Hour, "stale"}, {"repo", 2 * time.Hour, "stale"}} {
		if got := c.state(tc.key, saved.Add(tc.age)); got != tc.want {
			t.Errorf("state(%s,%v)=%q want %q", tc.key, tc.age, got, tc.want)
		}
	}
}

// With -race this also checks that reads obey the writer's locking rule.
func TestConcurrentState(t *testing.T) {
	c := &cache{saved: map[string]time.Time{}}
	var group sync.WaitGroup
	group.Add(2)
	go func() {
		defer group.Done()
		for range 100 {
			c.mu.Lock()
			c.saved["repo"] = time.Unix(100, 0)
			c.mu.Unlock()
		}
	}()
	go func() {
		defer group.Done()
		for range 100 {
			_ = c.state("repo", time.Unix(100, 0))
		}
	}()
	group.Wait()
	if got := c.state("repo", time.Unix(100, 0)); got != "fresh" {
		t.Errorf("state=%q", got)
	}
}
