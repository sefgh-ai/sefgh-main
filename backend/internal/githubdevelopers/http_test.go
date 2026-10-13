package githubdevelopers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestWireFanoutBoundAndOrdering(t *testing.T) {
	var mu sync.Mutex
	active, peak, calls := 0, 0, 0
	credentialLeak := false
	started := make(chan struct{}, 20)
	release := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		if r.Header.Get("Authorization") != "" {
			credentialLeak = true
		}
		mu.Unlock()
		if r.URL.Path == "/search/users" {
			items := []map[string]any{}
			for i := 0; i < 9; i++ {
				items = append(items, map[string]any{"login": fmt.Sprintf("user%d", i), "id": i})
			}
			json.NewEncoder(w).Encode(map[string]any{"items": items})
			return
		}
		mu.Lock()
		active++
		calls++
		if active > peak {
			peak = active
		}
		mu.Unlock()
		started <- struct{}{}
		select {
		case <-release:
		case <-time.After(2 * time.Second):
		}
		io.WriteString(w, `[{"name":"demo"}]`)
		mu.Lock()
		active--
		mu.Unlock()
	}))
	defer upstream.Close()
	h := &Handler{BaseURL: upstream.URL, Client: upstream.Client()}
	rec := httptest.NewRecorder()
	done := make(chan struct{})
	go func() {
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/trending-developers", nil))
		close(done)
	}()
	for i := 0; i < MaxConcurrent; i++ {
		select {
		case <-started:
		case <-time.After(3 * time.Second):
			t.Fatal("workers did not start")
		}
	}
	close(release)
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("handler did not finish")
	}
	upstream.Close()
	mu.Lock()
	defer mu.Unlock()
	if calls != 9 || peak != MaxConcurrent || active != 0 || credentialLeak {
		t.Fatalf("calls=%d peak=%d active=%d leak=%v", calls, peak, active, credentialLeak)
	}
	var result []map[string]any
	if rec.Code != 200 || json.Unmarshal(rec.Body.Bytes(), &result) != nil || len(result) != 9 {
		t.Fatalf("response %d %s", rec.Code, rec.Body.String())
	}
	for i, row := range result {
		if row["rank"] != float64(i+1) || row["username"] != fmt.Sprintf("user%d", i) {
			t.Fatalf("out of order: %v", row)
		}
	}
}

func TestCancellationJoinsEnrichment(t *testing.T) {
	var mu sync.Mutex
	active := 0
	h := &Handler{Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if strings.HasPrefix(r.URL.RequestURI(), "/search/") {
			return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"items":[{"login":"a"},{"login":"b"}]}`)), Header: http.Header{}}, nil
		}
		mu.Lock()
		active++
		mu.Unlock()
		<-r.Context().Done()
		mu.Lock()
		active--
		mu.Unlock()
		return nil, r.Context().Err()
	})}}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/trending-developers", nil).WithContext(ctx))
	mu.Lock()
	defer mu.Unlock()
	if rec.Code != 500 || active != 0 {
		t.Fatalf("status=%d active=%d", rec.Code, active)
	}
}
