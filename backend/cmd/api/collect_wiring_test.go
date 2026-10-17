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

// collectUpstream stands in for Supabase Auth and the Data API, and records
// each call as "METHOD path?query|Authorization|apikey|X-GitHub-Token".
type collectUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *collectUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.Method+" "+r.URL.RequestURI()+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/auth/v1/user" && r.Header.Get("Authorization") == "Bearer session-a":
		io.WriteString(w, `{"id":"user-a"}`)
	case r.URL.Path == "/rest/v1/repo_collections" && r.Method == "POST":
		w.WriteHeader(201)
	case r.URL.Path == "/rest/v1/repo_collections" && r.Method == "GET":
		io.WriteString(w, `[{"user_id":"user-a"}]`)
	default:
		w.WriteHeader(401)
		io.WriteString(w, `{}`)
	}
}

func collectServer(t *testing.T) (http.Handler, *collectUpstream) {
	t.Helper()
	stand := &collectUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), stand
}

// A save goes to Supabase as the caller, with the caller's own token, and
// no GitHub credential goes anywhere.
func TestCollectWritesAsTheCaller(t *testing.T) {
	handler, stand := collectServer(t)
	req := httptest.NewRequest("POST", "/api/repo/collect", strings.NewReader(`{"repoFullName":"octo/demo"}`))
	req.Header.Set("Authorization", "Bearer session-a")
	req.Header.Set("X-GitHub-Token", "caller-github-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || rec.Body.String() != `{"success":true,"saved":true,"totalSaves":1}` {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("X-SEFGH-Backend"); got != "go" {
		t.Errorf("backend header %q", got)
	}
	want := []string{
		"GET /auth/v1/user|Bearer session-a|public-key|",
		"POST /rest/v1/repo_collections|Bearer session-a|public-key|",
		"GET /rest/v1/repo_collections?select=user_id&repo_full_name=eq.octo%2Fdemo|Bearer session-a|public-key|",
	}
	if got := strings.Join(stand.seen, "\n"); got != strings.Join(want, "\n") {
		t.Errorf("upstream saw\n%s\nwant\n%s", got, strings.Join(want, "\n"))
	}
}

// Signed out, a save is refused before the database is asked, and a read
// goes with the public key. Other methods get Go's 405.
func TestCollectSignedOut(t *testing.T) {
	handler, stand := collectServer(t)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("POST", "/api/repo/collect", strings.NewReader(`{"repoFullName":"octo/demo"}`)))
	if rec.Code != 401 || len(stand.seen) != 0 {
		t.Errorf("POST: %d, upstream %v", rec.Code, stand.seen)
	}
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("GET", "/api/repo/collect?repo=octo%2Fdemo", nil))
	if rec.Code != 200 || len(stand.seen) != 1 || !strings.HasSuffix(stand.seen[0], "|Bearer public-key|public-key|") {
		t.Errorf("GET: %d %s, upstream %v", rec.Code, rec.Body, stand.seen)
	}
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("PUT", "/api/repo/collect", nil))
	if rec.Code != 405 {
		t.Errorf("PUT: %d, want 405", rec.Code)
	}
}
