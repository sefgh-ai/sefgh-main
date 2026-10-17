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

// voteUpstream stands in for Supabase Auth and the Data API, without the
// stats function, as on the live database. It records each call as
// "METHOD path?query|Authorization|apikey|X-GitHub-Token".
type voteUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *voteUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.Method+" "+r.URL.RequestURI()+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/auth/v1/user" && r.Header.Get("Authorization") == "Bearer session-a":
		io.WriteString(w, `{"id":"user-a"}`)
	case r.URL.Path == "/rest/v1/repo_votes" && r.Method == "POST":
		w.WriteHeader(201)
	case r.URL.Path == "/rest/v1/rpc/get_repo_vote_stats":
		w.WriteHeader(404)
		io.WriteString(w, `{"code":"PGRST202","message":"Could not find the function"}`)
	case r.URL.Path == "/rest/v1/repo_votes" && r.Method == "GET":
		io.WriteString(w, `[{"vote_type":"upvote"}]`)
	default:
		w.WriteHeader(401)
		io.WriteString(w, `{}`)
	}
}

// A vote goes to Supabase as the caller, with the caller's own token; the
// missing stats function is called, then the votes are counted. No GitHub
// credential goes anywhere.
func TestVoteWritesAsTheCaller(t *testing.T) {
	stand := &voteUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	handler := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))

	req := httptest.NewRequest("POST", "/api/repo/vote", strings.NewReader(`{"repoFullName":"octo/demo","voteType":"upvote"}`))
	req.Header.Set("Authorization", "Bearer session-a")
	req.Header.Set("X-GitHub-Token", "caller-github-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	want := `{"success":true,"votes":{"upvotes":1,"downvotes":0,"net_votes":1},"userVote":"upvote"}`
	if rec.Code != 200 || rec.Body.String() != want {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("X-SEFGH-Backend"); got != "go" {
		t.Errorf("backend header %q", got)
	}
	wantSeen := []string{
		"GET /auth/v1/user|Bearer session-a|public-key|",
		"POST /rest/v1/repo_votes?on_conflict=user_id%2Crepo_full_name|Bearer session-a|public-key|",
		"POST /rest/v1/rpc/get_repo_vote_stats|Bearer session-a|public-key|",
		"GET /rest/v1/repo_votes?select=vote_type&repo_full_name=eq.octo%2Fdemo|Bearer session-a|public-key|",
	}
	if got := strings.Join(stand.seen, "\n"); got != strings.Join(wantSeen, "\n") {
		t.Errorf("upstream saw\n%s\nwant\n%s", got, strings.Join(wantSeen, "\n"))
	}

	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("DELETE", "/api/repo/vote", nil))
	if rec.Code != 405 {
		t.Errorf("DELETE: %d, want 405", rec.Code)
	}
}
