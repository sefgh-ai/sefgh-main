package trendingtopics

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// At most two searches run at once: GitHub limits search more tightly than
// its other calls.
func TestSearchesRunTwoAtATime(t *testing.T) {
	var mu sync.Mutex
	running, most := 0, 0
	h := &Handler{Logger: discard, Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		mu.Lock()
		running++
		most = max(most, running)
		mu.Unlock()
		time.Sleep(20 * time.Millisecond)
		mu.Lock()
		running--
		mu.Unlock()
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"items":[]}`)), Request: r}, nil
	})}}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/trending/topics", nil))
	if w.Code != 200 || w.Header().Get("Cache-Control") != CacheComplete {
		t.Fatalf("%d %q", w.Code, w.Header().Get("Cache-Control"))
	}
	if most > concurrency {
		t.Errorf("%d searches ran at once, more than %d", most, concurrency)
	}
}

// One budget bounds all six searches. Here every search hangs until it is
// cancelled: each must carry the budget's deadline, and then every topic
// counts as failed, so the answer is 502 and is not cached. The deadline is
// checked, not the time taken, so a busy machine cannot fail this test.
func TestBudgetBoundsHangingSearches(t *testing.T) {
	const budget = 50 * time.Millisecond
	var mu sync.Mutex
	unbounded := 0
	h := &Handler{Logger: discard, Budget: budget, Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if deadline, ok := r.Context().Deadline(); !ok || time.Until(deadline) > budget {
			mu.Lock()
			unbounded++
			mu.Unlock()
		}
		<-r.Context().Done()
		return nil, r.Context().Err()
	})}}
	w := httptest.NewRecorder()
	done := make(chan struct{})
	go func() {
		defer close(done)
		h.ServeHTTP(w, httptest.NewRequest("GET", "/api/trending/topics", nil))
	}()
	select {
	case <-done:
	case <-time.After(30 * time.Second):
		t.Fatal("no answer after 30 seconds: the hanging searches were waited for")
	}
	mu.Lock()
	defer mu.Unlock()
	if unbounded != 0 {
		t.Errorf("%d searches had no deadline within the %v budget", unbounded, budget)
	}
	if w.Code != 502 || w.Header().Get("Cache-Control") != "no-store" {
		t.Errorf("%d %q %s", w.Code, w.Header().Get("Cache-Control"), w.Body)
	}
}

// The log names the topic and the cause, never the search's URL.
func TestLogsLeaveOutTheURL(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{
		BaseURL: "https://github-secret-host.invalid",
		Logger:  slog.New(slog.NewTextHandler(&logs, nil)),
		Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			return nil, io.ErrUnexpectedEOF
		})},
	}
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/api/trending/topics", nil))
	text := logs.String()
	if strings.Count(text, "trending topic search failed") != len(Topics) || !strings.Contains(text, "topic=ai-ml") {
		t.Errorf("the failures were not logged: %s", text)
	}
	if strings.Contains(text, "github-secret-host") || strings.Contains(text, "created") {
		t.Errorf("the log holds the search URL: %s", text)
	}
}
