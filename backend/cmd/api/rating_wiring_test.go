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

// ratingUpstream stands in for Supabase Auth and the Data API, and records
// each call as "METHOD path?query|Authorization|apikey|X-GitHub-Token".
type ratingUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *ratingUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.Method+" "+r.URL.RequestURI()+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/auth/v1/user" && r.Header.Get("Authorization") == "Bearer session-a":
		io.WriteString(w, `{"id":"user-a"}`)
	case r.URL.Path == "/rest/v1/repo_ratings" && r.Method == "POST":
		w.WriteHeader(201)
	case r.URL.Path == "/rest/v1/repo_ratings" && r.Method == "GET":
		io.WriteString(w, `[{"rating":4},{"rating":5}]`)
	default:
		w.WriteHeader(401)
		io.WriteString(w, `{}`)
	}
}

// A rating goes to Supabase as the caller, with the caller's own token, and
// no GitHub credential goes anywhere.
func TestRatingWritesAsTheCaller(t *testing.T) {
	stand := &ratingUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	handler := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))

	req := httptest.NewRequest("POST", "/api/repo/rating", strings.NewReader(`{"repoFullName":"octo/demo","rating":4}`))
	req.Header.Set("Authorization", "Bearer session-a")
	req.Header.Set("X-GitHub-Token", "caller-github-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || rec.Body.String() != `{"success":true,"ratings":{"total":2,"average":4.5}}` {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	want := []string{
		"GET /auth/v1/user|Bearer session-a|public-key|",
		"POST /rest/v1/repo_ratings?on_conflict=user_id%2Crepo_full_name|Bearer session-a|public-key|",
		"GET /rest/v1/repo_ratings?select=rating&repo_full_name=eq.octo%2Fdemo|Bearer session-a|public-key|",
	}
	if got := strings.Join(stand.seen, "\n"); got != strings.Join(want, "\n") {
		t.Errorf("upstream saw\n%s\nwant\n%s", got, strings.Join(want, "\n"))
	}
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("PUT", "/api/repo/rating", nil))
	if rec.Code != 405 {
		t.Errorf("PUT: %d, want 405", rec.Code)
	}
}
