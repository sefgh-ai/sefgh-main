package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync"
	"testing"
)

// commentsUpstream stands in for Supabase Auth, its admin API and the Data
// API, and records each call as "METHOD path|Authorization|apikey|X-GitHub-Token".
type commentsUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *commentsUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.Method+" "+r.URL.Path+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/auth/v1/user" && r.Header.Get("Authorization") == "Bearer session-a":
		io.WriteString(w, `{"id":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b","email":"a@example.test"}`)
	case r.URL.Path == "/rest/v1/repo_comments" && r.Method == "GET":
		io.WriteString(w, `[{"id":"c1","user_id":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b"}]`)
	case r.URL.Path == "/rest/v1/repo_comments" && r.Method == "HEAD":
		w.Header().Set("Content-Range", "0-1/2")
	case r.URL.Path == "/rest/v1/repo_comments" && r.Method == "POST":
		w.WriteHeader(201)
		io.WriteString(w, `{"id":"c9","comment_text":"Hi"}`)
	default:
		w.WriteHeader(403)
		io.WriteString(w, `{}`)
	}
}

func commentsServer(t *testing.T) (http.Handler, *commentsUpstream) {
	t.Helper()
	stand := &commentsUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), stand
}

// Signed in, the comment list and its counts go with the caller's token,
// and the admin lookup with the public key only, never the caller's token
// or a server key (bug register R-040). No GitHub credential goes anywhere.
func TestCommentsListAsTheCaller(t *testing.T) {
	handler, stand := commentsServer(t)
	req := httptest.NewRequest("GET", "/api/repo/comments?repo=octo%2Fdemo", nil)
	req.Header.Set("Authorization", "Bearer session-a")
	req.Header.Set("X-GitHub-Token", "caller-github-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"reply_count":2`) {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	seen := append([]string(nil), stand.seen...)
	sort.Strings(seen)
	want := []string{
		"GET /auth/v1/admin/users/0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b|Bearer public-key|public-key|",
		"GET /rest/v1/profiles|Bearer session-a|public-key|",
		"GET /rest/v1/repo_comments|Bearer session-a|public-key|",
		"HEAD /rest/v1/repo_comments|Bearer session-a|public-key|",
	}
	if strings.Join(seen, "\n") != strings.Join(want, "\n") {
		t.Errorf("upstream saw\n%s\nwant\n%s", strings.Join(seen, "\n"), strings.Join(want, "\n"))
	}
}

// A new comment is written as the caller, and the reply carries the email
// Supabase Auth gave.
func TestCommentsPostAsTheCaller(t *testing.T) {
	handler, stand := commentsServer(t)
	req := httptest.NewRequest("POST", "/api/repo/comments", strings.NewReader(`{"repoFullName":"octo/demo","commentText":" Hi "}`))
	req.Header.Set("Authorization", "Bearer session-a")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	want := `{"success":true,"comment":{"id":"c9","comment_text":"Hi","user_name":null,"user_email":"a@example.test","user_avatar":null}}`
	if rec.Code != 200 || rec.Body.String() != want {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if got := stand.seen[1]; got != "POST /rest/v1/repo_comments|Bearer session-a|public-key|" {
		t.Errorf("the insert went as %q", got)
	}
}
