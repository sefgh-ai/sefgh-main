package githubrepos

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// A timeout-free client makes this fail if fetch loses its own deadline.
// Inspect the deadline instead of sleeping for ten seconds.
func TestFetchSetsIndependentTenSecondDeadline(t *testing.T) {
	sentinel := errors.New("transport stopped")
	start := time.Now()
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		deadline, ok := r.Context().Deadline()
		if !ok {
			t.Fatal("fetch supplied no deadline")
		}
		if deadline.Before(start.Add(9*time.Second)) || deadline.After(time.Now().Add(10*time.Second)) {
			t.Fatalf("deadline %v does not bound this call to ten seconds", deadline)
		}
		return nil, sentinel
	})}
	h := New(client, defaultBaseURL, "")
	_, err := h.fetch(context.Background(), defaultBaseURL+"/repos/o/r", "application/json", false)
	if !errors.Is(err, sentinel) {
		t.Fatalf("lost transport cause: %v", err)
	}
}

func TestFetchLogsCausesWithoutURLOrCredentials(t *testing.T) {
	for _, tc := range []struct {
		name   string
		status int
		err    error
		body   string
		want   string
	}{
		{"dns", 0, errors.New("lookup failed"), "", "lookup failed"},
		{"timeout", 0, context.DeadlineExceeded, "", "context deadline exceeded"},
		{"github", 500, nil, "not logged body", "status=500"},
		{"oversized", 200, nil, strings.Repeat("x", maxBodyBytes+1), "exceeds"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var logs bytes.Buffer
			client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				if tc.err != nil {
					return nil, tc.err
				}
				return &http.Response{StatusCode: tc.status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(tc.body))}, nil
			})}
			h := New(client, defaultBaseURL, "test-token-do-not-log")
			h.Logger = slog.New(slog.NewTextHandler(&logs, nil))
			_, _ = h.fetch(context.Background(), defaultBaseURL+"/private-target-do-not-log", "application/json", true)
			if !strings.Contains(logs.String(), tc.want) {
				t.Fatalf("missing cause %q in %s", tc.want, logs.String())
			}
			for _, secret := range []string{"test-token-do-not-log", "private-target-do-not-log", "not logged body"} {
				if strings.Contains(logs.String(), secret) {
					t.Fatalf("log contains sensitive input: %s", logs.String())
				}
			}
		})
	}
}

func TestOKAndRepeatedRateLimitHeaders(t *testing.T) {
	for _, status := range []int{199, 200, 201, 299, 300, 404, 500} {
		if got := (upstreamReply{status: status}).ok(); got != (status >= 200 && status <= 299) {
			t.Errorf("ok(%d) = %v", status, got)
		}
	}
	h := http.Header{}
	h.Add("X-Ratelimit-Remaining", "1")
	h.Add("X-Ratelimit-Remaining", "2")
	if got := rateLimit(h)["remaining"]; got != "1, 2" {
		t.Fatalf("repeated header = %v", got)
	}
}

func TestUpstreamTimeoutAndCancellation(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() }))
	defer upstream.Close()
	for _, cancelCaller := range []bool{false, true} {
		client := &http.Client{Timeout: 20 * time.Millisecond}
		h := New(client, upstream.URL, "")
		ctx, cancel := context.WithCancel(context.Background())
		if cancelCaller {
			cancel()
		}
		start := time.Now()
		_, err := h.fetch(ctx, upstream.URL+"/repos/o/r", "application/json", false)
		cancel()
		if err == nil {
			t.Fatal("upstream wait was not canceled")
		}
		if time.Since(start) > time.Second {
			t.Fatal("unbounded upstream wait")
		}
	}
}

func TestUpstreamBodyLimit(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(strings.Repeat("x", maxBodyBytes+1)))}, nil
	})}
	h := New(client, defaultBaseURL, "")
	if _, err := h.fetch(context.Background(), defaultBaseURL+"/repos/o/r", "application/json", false); err == nil {
		t.Fatal("oversized response accepted")
	}
}
