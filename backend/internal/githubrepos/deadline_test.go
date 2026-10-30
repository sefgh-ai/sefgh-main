package githubrepos

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// The detail route makes three calls to GitHub in a row. These tests give it
// a GitHub that answers some calls and then hangs, and check that the whole
// route still finishes on its own deadline.

// hangingAfter answers the first n calls and never answers a later one; a
// later call returns only when its request is cancelled.
func hangingAfter(n int32, calls *atomic.Int32) *http.Client {
	return &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if calls.Add(1) > n {
			<-r.Context().Done()
			return nil, r.Context().Err()
		}
		body := `{"languages_url":"https://api.github.com/repos/octo/demo/languages","id":1}`
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	})}
}

func detailWithDeadline(client *http.Client, deadline time.Duration) (*httptest.ResponseRecorder, time.Duration) {
	h := New(client, defaultBaseURL, "")
	h.detailTimeout = deadline
	mux := http.NewServeMux()
	h.Register(mux)
	rec := httptest.NewRecorder()
	start := time.Now()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/github/repo/octo/demo", nil))
	return rec, time.Since(start)
}

func TestDetailStopsWaitingForAHungReadme(t *testing.T) {
	var calls atomic.Int32
	rec, took := detailWithDeadline(hangingAfter(2, &calls), 60*time.Millisecond)

	// A README that cannot be fetched is not an error: the reply says null.
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("got %d %s, want 200 with JSON", rec.Code, rec.Body)
	}
	if readme, present := body["readme"]; !present || readme != nil {
		t.Errorf("readme = %v, want null", readme)
	}
	if took > 2*time.Second {
		t.Errorf("took %v; the route's own deadline was 60ms", took)
	}
	if calls.Load() != 3 {
		t.Errorf("calls = %d, want 3", calls.Load())
	}
}

func TestDetailStopsWaitingForAHungRepositoryCall(t *testing.T) {
	var calls atomic.Int32
	rec, took := detailWithDeadline(hangingAfter(0, &calls), 60*time.Millisecond)

	if rec.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want 502", rec.Code)
	}
	if took > 2*time.Second {
		t.Errorf("took %v; the route's own deadline was 60ms", took)
	}
}

func TestDetailStopsWaitingForAHungLanguagesCall(t *testing.T) {
	var calls atomic.Int32
	rec, took := detailWithDeadline(hangingAfter(1, &calls), 60*time.Millisecond)

	// Unlike the README, a transport failure during languages is a 502.
	if rec.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want 502", rec.Code)
	}
	if took > 2*time.Second {
		t.Errorf("took %v; the route's own deadline was 60ms", took)
	}
}

// With the real settings the whole route is bounded by DetailTimeout, not by
// three separate call timeouts added together.
func TestDetailDeadlineIsShorterThanThreeCallTimeouts(t *testing.T) {
	if DetailTimeout >= 3*upstreamTimeout {
		t.Errorf("DetailTimeout %v does not shorten three calls of %v", DetailTimeout, upstreamTimeout)
	}
	if DetailTimeout <= upstreamTimeout {
		t.Errorf("DetailTimeout %v leaves no room for a second call of %v", DetailTimeout, upstreamTimeout)
	}
	if got := New(nil, "", "").detailTimeout; got != DetailTimeout {
		t.Errorf("New sets detailTimeout to %v, want DetailTimeout", got)
	}
}
