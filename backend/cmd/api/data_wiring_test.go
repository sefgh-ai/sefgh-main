package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// A browser data request reaches the Data API as it was sent, through the
// server's whole handler, and is marked as Go's; a refused one never leaves.
func TestDataProxyThroughTheServer(t *testing.T) {
	var seen []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.Method+" "+r.URL.RequestURI()+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey"))
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `[{"id":"p1"}]`)
	}))
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	handler := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))

	r := httptest.NewRequest("GET", "/api/data/home/rest/v1/projects?select=%2A&order=created_at.desc", nil)
	r.Header.Set("Authorization", "Bearer user-token")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	if w.Code != 200 || w.Body.String() != `[{"id":"p1"}]` || w.Header().Get("X-Sefgh-Backend") != "go" {
		t.Fatalf("%d %s %v", w.Code, w.Body, w.Header())
	}
	if len(seen) != 1 || seen[0] != "GET /rest/v1/projects?select=%2A&order=created_at.desc|Bearer user-token|public-key" {
		t.Errorf("upstream saw %q", seen)
	}
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest("PATCH", "/api/data/user-stats/rest/v1/user_stats?user_id=eq.u1", strings.NewReader(`{"xp":1}`)))
	if w.Code != 403 || len(seen) != 1 {
		t.Errorf("refused write: %d, upstream %q", w.Code, seen)
	}
}
