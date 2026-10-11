package lesson07

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// headers builds an http.Header from name, value pairs.
func headers(pairs ...string) http.Header {
	h := http.Header{}
	for i := 0; i+1 < len(pairs); i += 2 {
		h.Set(pairs[i], pairs[i+1])
	}
	return h
}

func TestIsRateLimited(t *testing.T) {
	tests := []struct {
		name   string
		status int
		header http.Header
		want   bool
	}{
		{"429 is always a rate limit", 429, headers(), true},
		{"403 with nothing left", 403, headers("X-RateLimit-Remaining", "0"), true},
		{"403 with Retry-After", 403, headers("Retry-After", "30", "X-RateLimit-Remaining", "12"), true},
		{"403 with requests left", 403, headers("X-RateLimit-Remaining", "25"), false},
		{"403 with no headers", 403, headers(), false},
		{"200 is fine even at zero", 200, headers("X-RateLimit-Remaining", "0"), false},
		{"500 is a different problem", 500, headers("Retry-After", "30"), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isRateLimited(tt.status, tt.header); got != tt.want {
				t.Errorf("isRateLimited(%d, %v) = %v, want %v", tt.status, tt.header, got, tt.want)
			}
		})
	}
}

func TestHeaderValue(t *testing.T) {
	h := headers("X-RateLimit-Remaining", "9", "X-Empty", "")

	if got := headerValue(h, "X-RateLimit-Remaining"); got == nil || *got != "9" {
		t.Errorf("present header: got %v, want a pointer to \"9\"", show(got))
	}
	if got := headerValue(h, "X-Empty"); got == nil || *got != "" {
		t.Errorf("empty header: got %v, want a pointer to \"\"", show(got))
	}
	if got := headerValue(h, "X-Missing"); got != nil {
		t.Errorf("missing header: got %v, want nil", show(got))
	}
}

func show(p *string) string {
	if p == nil {
		return "nil"
	}
	return `a pointer to "` + *p + `"`
}

func TestFetchStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/missing" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	client := &http.Client{Timeout: 5 * time.Second}

	if got, err := fetchStatus(client, server.URL+"/ok"); err != nil || got != 200 {
		t.Errorf("fetchStatus(/ok) = %d, %v; want 200, nil", got, err)
	}
	// A 404 is a reply, not a failure: no error.
	if got, err := fetchStatus(client, server.URL+"/missing"); err != nil || got != 404 {
		t.Errorf("fetchStatus(/missing) = %d, %v; want 404, nil", got, err)
	}

	// Stop the server. Now the request itself fails.
	server.Close()
	if _, err := fetchStatus(client, server.URL+"/ok"); err == nil {
		t.Error("fetchStatus to a stopped server returned no error")
	}
}
