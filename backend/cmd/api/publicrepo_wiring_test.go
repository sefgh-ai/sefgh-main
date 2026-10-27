package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

// publicRepoGitHub stands in for GitHub and Supabase Auth, and records the
// path and credentials of every request.
type publicRepoGitHub struct {
	mu   sync.Mutex
	seen []string
}

func (s *publicRepoGitHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.URL.Path+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"id":1,"name":"demo","private":false}`)
}

// The repository page's read is answered without asking who calls, and no
// caller's credential, nor GITHUB_TOKEN, reaches GitHub (REPO-PAGE-001).
func TestPublicRepoIsPublicOnly(t *testing.T) {
	stand := &publicRepoGitHub{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	handler := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))

	req := httptest.NewRequest("GET", "/api/github/public-repo/octo/demo", nil)
	req.Header.Set("Authorization", "Bearer session-a")
	req.Header.Set("X-GitHub-Token", "caller-github-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || rec.Body.String() != `{"id":1,"name":"demo","private":false}` || rec.Header().Get("X-Sefgh-Backend") != "go" || rec.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("%d %v %s", rec.Code, rec.Header(), rec.Body)
	}
	if len(stand.seen) != 1 || stand.seen[0] != "/repos/octo/demo||" {
		t.Errorf("requests %q, want one GitHub read without credentials and no Auth call", stand.seen)
	}

	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("POST", "/api/github/public-repo/octo/demo", nil))
	if rec.Code != 405 {
		t.Errorf("POST: %d, want 405", rec.Code)
	}
}
