package lesson19

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

var start = time.Date(2026, 10, 13, 12, 0, 0, 0, time.UTC)

func at(seconds int) time.Time { return start.Add(time.Duration(seconds) * time.Second) }

func TestAllowInsideOneWindow(t *testing.T) {
	c := newCounter(2, 10*time.Second)
	steps := []struct {
		key     string
		seconds int
		want    bool
		why     string
	}{
		{"a", 1, true, "first request"},
		{"a", 4, true, "second request"},
		{"a", 5, false, "the limit of two is reached"},
		{"b", 5, true, "another caller has its own count"},
		{"a", 10, false, "the request at second 1 is 9 seconds old: still inside"},
		{"a", 11, true, "the request at second 1 is exactly one window old: gone"},
		{"a", 12, false, "seconds 4 and 11 are both inside"},
		{"a", 14, true, "the request at second 4 is gone"},
	}
	for _, s := range steps {
		if got := c.allow(s.key, at(s.seconds)); got != s.want {
			t.Errorf("allow(%q) at second %d = %v, want %v: %s", s.key, s.seconds, got, s.want, s.why)
		}
	}
}

func TestRefusedRequestIsNotRecorded(t *testing.T) {
	c := newCounter(1, 10*time.Second)
	if !c.allow("a", at(0)) {
		t.Fatal("the first request was refused")
	}
	for second := 1; second < 10; second++ {
		if c.allow("a", at(second)) {
			t.Fatalf("allowed at second %d, inside the window of the first request", second)
		}
	}
	if !c.allow("a", at(10)) {
		t.Error("refused at second 10: the nine refused requests must not have counted")
	}
}

// 64 goroutines at one moment. Each brings 100 callers of its own, and all
// of them press on one shared caller. Exactly the limit get through for the
// shared caller. Without the lock this test stops the program with
// "concurrent map writes". That is the reason for the lock.
func TestAllowFromManyGoroutines(t *testing.T) {
	c := newCounter(30, 5*time.Minute)
	var wg sync.WaitGroup
	var mu sync.Mutex
	allowed := 0
	for g := 0; g < 64; g++ {
		wg.Add(1)
		go func(g int) {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				c.allow(fmt.Sprintf("caller %d-%d", g, i), start)
				if c.allow("shared caller", start) {
					mu.Lock()
					allowed++
					mu.Unlock()
				}
			}
		}(g)
	}
	wg.Wait()
	if allowed != 30 {
		t.Errorf("%d requests allowed for the shared caller, want exactly 30", allowed)
	}
}
