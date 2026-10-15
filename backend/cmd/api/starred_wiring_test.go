package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// starredUpstream stands in for Supabase and GitHub on one address, and
// records each call as "path|Authorization|apikey|X-GitHub-Token".
type starredUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *starredUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.URL.Path+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/auth/v1/user" && r.Header.Get("Authorization") == "Bearer session-a" && r.Header.Get("apikey") == "public-key":
		io.WriteString(w, `{"id":"user-a"}`)
	case r.URL.Path == "/rest/v1/repo_collections" && r.Header.Get("Authorization") == "Bearer session-a":
		io.WriteString(w, `[{"id":1,"repo_full_name":"octo/demo","notes":"mine"}]`)
	case r.URL.Path == "/repos/octo/demo":
		io.WriteString(w, `{"private":false,"description":"public demo","stargazers_count":5}`)
	default:
		w.WriteHeader(401)
		io.WriteString(w, `{}`)
	}
}

func (s *starredUpstream) take() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	seen := s.seen
	s.seen = nil
	return seen
}

func starredServer(t *testing.T) (http.Handler, *starredUpstream) {
	t.Helper()
	stand := &starredUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), stand
}

func askStarred(handler http.Handler, method string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, "/api/repo/starred", nil)
	for name, value := range headers {
		req.Header.Set(name, value)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

// The caller's token goes to Supabase only. GitHub gets no credential at
// all: not the caller's GitHub token, not GITHUB_TOKEN.
func TestStarredCredentialsGoOnlyWhereTheyBelong(t *testing.T) {
	handler, stand := starredServer(t)
	rec := askStarred(handler, "GET", map[string]string{"Authorization": "Bearer session-a", "X-GitHub-Token": "caller-github-token"})
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"repo_data":{"description":"public demo","stargazers_count":5}`) {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	want := []string{
		"/auth/v1/user|Bearer session-a|public-key|",
		"/rest/v1/repo_collections|Bearer session-a|public-key|",
		"/repos/octo/demo|||",
	}
	if got := stand.take(); strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Errorf("reached\n%q\nwant\n%q", got, want)
	}
	if rec.Header().Get("Cache-Control") != "private, no-store" || rec.Header().Get("X-Sefgh-Backend") != "go" {
		t.Errorf("headers %v", rec.Header())
	}
}

func TestStarredNeedsAUserAndAcceptsOnlyGet(t *testing.T) {
	handler, stand := starredServer(t)
	if rec := askStarred(handler, "GET", nil); rec.Code != 401 || strings.TrimSpace(rec.Body.String()) != `{"error":"Unauthorized"}` {
		t.Errorf("no session: %d %s", rec.Code, rec.Body)
	}
	if rec := askStarred(handler, "POST", map[string]string{"Authorization": "Bearer session-a"}); rec.Code != 405 {
		t.Errorf("POST: %d, want 405", rec.Code)
	}
	if got := stand.take(); len(got) != 0 {
		t.Errorf("refused requests reached %q", got)
	}
}
