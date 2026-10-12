package githubrepos

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

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
