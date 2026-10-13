package ailimit

import (
	"fmt"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

var start = time.Date(2026, 10, 13, 12, 0, 0, 0, time.UTC)

func at(ms int) time.Time { return start.Add(time.Duration(ms) * time.Millisecond) }

// The same steps, with the same answers, as the limiter tests in
// scripts/contracts/ai-guard.test.mjs. The two must agree.
func TestLimiterMatchesTheJavaScriptOne(t *testing.T) {
	l := New(2, 10*time.Second)
	steps := []struct {
		key  string
		ms   int
		want int
		why  string
	}{
		{"a", 1000, 0, "first"},
		{"a", 4000, 0, "second"},
		{"b", 4000, 0, "another key has its own count"},
		{"a", 4500, 7, "the oldest request leaves at 11000: 6.5 s, rounded up"},
		{"a", 10999, 1, "never less than one second"},
		{"a", 11000, 0, "allowed once the oldest is exactly one window old"},
		{"a", 11001, 3, "the request at 4000 is the oldest now"},
	}
	for _, s := range steps {
		if got := l.Take(s.key, at(s.ms)); got != s.want {
			t.Errorf("Take(%q, %dms) = %d, want %d: %s", s.key, s.ms, got, s.want, s.why)
		}
	}
}

func TestRefusedRequestIsNotCounted(t *testing.T) {
	l := New(1, 10*time.Second)
	if l.Take("a", at(0)) != 0 {
		t.Fatal("first request refused")
	}
	for ms := 1; ms < 10000; ms += 1000 {
		if l.Take("a", at(ms)) == 0 {
			t.Fatalf("request at %dms allowed", ms)
		}
	}
	if got := l.Take("a", at(10000)); got != 0 {
		t.Errorf("Take at 10000ms = %d; only the first request was holding the allowance", got)
	}
}

func TestLimiterForgetsTheCallerUnusedForLongest(t *testing.T) {
	l := New(1, 10*time.Second)
	l.maxKeys = 3
	for _, key := range []string{"a", "b", "c"} {
		if l.Take(key, at(0)) != 0 {
			t.Fatalf("%s refused", key)
		}
	}
	if l.Take("a", at(1)) == 0 {
		t.Error("a should be refused; being refused also makes it the most recently seen")
	}
	if l.Take("d", at(2)) != 0 {
		t.Error("a fourth caller should be allowed, and pushes out b")
	}
	if l.Take("b", at(3)) != 0 {
		t.Error("b was forgotten, so it starts again")
	}
	if l.Take("a", at(4)) == 0 {
		t.Error("a was kept and is still refused")
	}
	if l.Take("d", at(5)) == 0 {
		t.Error("d was kept and is still refused")
	}
	if len(l.callers) != 3 || l.recency.Len() != 3 {
		t.Errorf("remembering %d callers in the map and %d in the list, want 3 and 3", len(l.callers), l.recency.Len())
	}
}

// Many goroutines at once. Each brings callers of its own, so the map and
// the list grow from every goroutine, and all of them press on one shared
// caller. Exactly the allowance gets through for that caller, and the map
// and the list still agree. Without the lock Go stops the program here with
// "concurrent map writes"; with -race it reports the first unlocked access.
func TestLimiterIsSafeForConcurrentUse(t *testing.T) {
	l := New(Requests, Window)
	var wg sync.WaitGroup
	var mu sync.Mutex
	allowed := 0
	for g := 0; g < 64; g++ {
		wg.Add(1)
		go func(g int) {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				l.Take(fmt.Sprintf("caller %d-%d", g, i), start)
				if l.Take("shared caller", start) == 0 {
					mu.Lock()
					allowed++
					mu.Unlock()
				}
			}
		}(g)
	}
	wg.Wait()
	if allowed != Requests {
		t.Errorf("%d requests allowed for the shared caller, want exactly %d", allowed, Requests)
	}
	if len(l.callers) != 64*100+1 || l.recency.Len() != len(l.callers) {
		t.Errorf("remembering %d callers in the map and %d in the list, want %d in both", len(l.callers), l.recency.Len(), 64*100+1)
	}
}

func TestApprovedLimits(t *testing.T) {
	if Requests != 30 || Window != 5*time.Minute || ChatMessages != 20 || ChatCharacters != 8000 || QueryCharacters != 500 {
		t.Error("the limits differ from the ones the owner approved on 2026-10-13 and from src/lib/ai/guard.js")
	}
}

func TestClientAddress(t *testing.T) {
	tests := []struct {
		name   string
		values []string
		want   string
	}{
		{"no header", nil, "unknown"},
		{"empty header", []string{""}, "unknown"},
		{"one address", []string{"203.0.113.9"}, "203.0.113.9"},
		{"a list: the first is the caller", []string{" 203.0.113.9 , 10.0.0.1"}, "203.0.113.9"},
		{"an empty first entry", []string{", 10.0.0.1"}, "unknown"},
		{"two header lines are one list", []string{"203.0.113.9", "10.0.0.1"}, "203.0.113.9"},
	}
	for _, tt := range tests {
		r := httptest.NewRequest("POST", "/", nil)
		for _, v := range tt.values {
			r.Header.Add("X-Forwarded-For", v)
		}
		if got := ClientAddress(r); got != tt.want {
			t.Errorf("%s: ClientAddress = %q, want %q", tt.name, got, tt.want)
		}
	}
}
