package searchhistory

import (
	"bytes"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

const userA, userB = "0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b", "7d6c5b4a-3f2e-4d1c-8b9a-a0b1c2d3e4f5"

// served builds the endpoints for a caller who is user B, recording every
// Data API request.
func served(t *testing.T, seen *[]string, logger *slog.Logger) *http.ServeMux {
	t.Helper()
	h := &Handler{
		User: func(*http.Request) (string, string, int) { return userB, "session-b", 200 },
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			*seen = append(*seen, r.Method+" "+r.URL.RequestURI()+" "+r.Header.Get("Authorization"))
			return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`[{"source":"search"}]`)), Request: r}, nil
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: logger,
	}
	mux := http.NewServeMux()
	h.Register(mux)
	return mux
}

// Two-user isolation (ADR-0002, Phase 3): user B naming user A's id reads,
// saves, counts and clears nothing of A's, and the database is not asked.
// B's own requests carry B's token, so row-level security sees B.
func TestAnotherUsersIDReachesNothing(t *testing.T) {
	var seen []string
	mux := served(t, &seen, slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, tt := range []struct{ method, target, body, want string }{
		{"POST", "/api/search-history", `{"user":"` + userA + `","query":"rust","source":"search"}`, "null"},
		{"GET", "/api/search-history?user=" + userA + "&offset=0&limit=50", "", "[]"},
		{"GET", "/api/search-history/count?user=" + userA, "", `{"total":0,"search":0,"chat":0}`},
		{"DELETE", "/api/search-history?user=" + userA, "", "true"},
	} {
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, httptest.NewRequest(tt.method, tt.target, strings.NewReader(tt.body)))
		if w.Code != 200 || strings.TrimSpace(w.Body.String()) != tt.want {
			t.Errorf("%s %s: %d %s, want %s", tt.method, tt.target, w.Code, w.Body, tt.want)
		}
	}
	if len(seen) != 0 {
		t.Errorf("the database was asked: %q", seen)
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("GET", "/api/search-history/count?user="+userB, nil))
	if w.Code != 200 || len(seen) != 1 || !strings.HasSuffix(seen[0], "user_id=eq."+userB+" Bearer session-b") {
		t.Errorf("B's own count: %d %s, asked %q", w.Code, w.Body, seen)
	}
	if w.Header().Get("Cache-Control") != "private, no-store" {
		t.Errorf("cache control %q", w.Header().Get("Cache-Control"))
	}
}

// A body over MaxBodyBytes is refused before the database is asked.
func TestLongBodyIsRefused(t *testing.T) {
	var seen []string
	mux := served(t, &seen, slog.New(slog.NewTextHandler(io.Discard, nil)))
	body := `{"user":"` + userB + `","query":"` + strings.Repeat("x", MaxBodyBytes) + `"}`
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("POST", "/api/search-history", strings.NewReader(body)))
	if w.Code != 400 || len(seen) != 0 {
		t.Errorf("%d %s, database asked: %q", w.Code, w.Body, seen)
	}
}

// The log names the stage and the database's status, never the user, their
// token or what they searched for.
func TestLogsKeepTheSearchOut(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{
		User: func(*http.Request) (string, string, int) { return "user-secret-1", "session-secret-2", 200 },
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			return nil, errors.New("dial failed for " + r.URL.String())
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key",
		Logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	mux := http.NewServeMux()
	h.Register(mux)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("POST", "/api/search-history", strings.NewReader(`{"user":"user-secret-1","query":"query-secret-3"}`)))
	if w.Code != 200 || w.Body.String() != "null" {
		t.Errorf("%d %s", w.Code, w.Body)
	}
	text := logs.String()
	if !strings.Contains(text, "stage=save") {
		t.Errorf("the failure was not logged: %q", text)
	}
	for _, secret := range []string{"user-secret-1", "session-secret-2", "query-secret-3"} {
		if strings.Contains(text, secret) {
			t.Errorf("the log holds %q: %s", secret, text)
		}
	}
}
