package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/trendingtopics"
)

// topicsGitHub stands in for GitHub's search and records the credentials
// each search carried.
type topicsGitHub struct {
	mu   sync.Mutex
	seen []string
}

func (s *topicsGitHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.URL.Path+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"total_count":0,"items":[]}`)
}

// The trending topics are six public searches made without the caller's
// credentials, answered with the shared cache header. Only GET is served.
func TestTrendingTopicsAreSharedAndPublic(t *testing.T) {
	stand := &topicsGitHub{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	handler := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))

	req := httptest.NewRequest("GET", "/api/trending/topics", nil)
	req.Header.Set("Authorization", "Bearer session-a")
	req.Header.Set("X-GitHub-Token", "caller-github-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || rec.Header().Get("Cache-Control") != trendingtopics.CacheComplete || rec.Header().Get("X-Sefgh-Backend") != "go" {
		t.Fatalf("%d %v %s", rec.Code, rec.Header(), rec.Body)
	}
	if strings.Count(rec.Body.String(), `"complete":true`) != len(trendingtopics.Topics) {
		t.Errorf("not every topic was searched: %s", rec.Body)
	}
	if len(stand.seen) != len(trendingtopics.Topics) {
		t.Errorf("%d searches, want %d: %q", len(stand.seen), len(trendingtopics.Topics), stand.seen)
	}
	for _, seen := range stand.seen {
		if seen != "/search/repositories||" {
			t.Errorf("a search carried a credential: %q", seen)
		}
	}
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("POST", "/api/trending/topics", nil))
	if rec.Code != 405 {
		t.Errorf("POST: %d, want 405", rec.Code)
	}
}
