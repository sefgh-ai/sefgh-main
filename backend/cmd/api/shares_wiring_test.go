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

// sharesUpstream stands in for Supabase Auth and the Data API, and records
// each call as "METHOD path?query|Authorization|apikey|X-GitHub-Token".
type sharesUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *sharesUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.Method+" "+r.URL.RequestURI()+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/auth/v1/user" && r.Header.Get("Authorization") == "Bearer session-a":
		io.WriteString(w, `{"id":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b","email":"a@example.test"}`)
	case r.URL.Path == "/rest/v1/user_conversations" && r.Method == "GET":
		io.WriteString(w, `{"id":"c1","user_id":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b","title":"T","messages":[]}`)
	case r.URL.Path == "/rest/v1/rpc/upsert_shared_conversation":
		io.WriteString(w, `{"id":"s1","share_token":"tok"}`)
	case r.URL.Path == "/rest/v1/shared_conversations" && r.Method == "GET":
		io.WriteString(w, `{"id":"s1","title":"T","snapshot":[],"is_public":true}`)
	case r.URL.Path == "/rest/v1/user_conversations" && r.Method == "POST":
		w.WriteHeader(201)
		io.WriteString(w, `{"id":"c9"}`)
	default:
		w.WriteHeader(403)
		io.WriteString(w, `{}`)
	}
}

func sharesServer(t *testing.T, siteURL string) (http.Handler, *sharesUpstream) {
	t.Helper()
	stand := &sharesUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("NEXT_PUBLIC_SITE_URL", siteURL)
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), stand
}

// A share is made as the caller, and its link starts with
// NEXT_PUBLIC_SITE_URL. No GitHub credential goes anywhere.
func TestConversationShareAsTheCaller(t *testing.T) {
	handler, stand := sharesServer(t, "https://sefgh.test/")
	req := httptest.NewRequest("POST", "/api/conversations/c1/share", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer session-a")
	req.Header.Set("X-GitHub-Token", "caller-github-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || rec.Body.String() != `{"share":{"id":"s1","share_token":"tok"},"url":"https://sefgh.test/s/tok"}` {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	want := []string{
		"GET /auth/v1/user|Bearer session-a|public-key|",
		"GET /rest/v1/user_conversations?select=id%2Cuser_id%2Ctitle%2Cmessages&id=eq.c1&user_id=eq.0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b|Bearer session-a|public-key|",
		"POST /rest/v1/rpc/upsert_shared_conversation|Bearer session-a|public-key|",
	}
	if got := strings.Join(stand.seen, "\n"); got != strings.Join(want, "\n") {
		t.Errorf("upstream saw\n%s\nwant\n%s", got, strings.Join(want, "\n"))
	}
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("GET", "/api/conversations/c1/share", nil))
	if rec.Code != 405 {
		t.Errorf("GET: %d, want 405", rec.Code)
	}
}

// A fork is written as the caller, and the share's own GET still answers
// next to it. Signed out, without a bearer, a fork asks nothing upstream.
func TestShareForkAsTheCaller(t *testing.T) {
	handler, stand := sharesServer(t, "")
	req := httptest.NewRequest("POST", "/api/share/tok/fork", nil)
	req.Header.Set("Authorization", "Bearer session-a")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || rec.Body.String() != `{"conversationId":"c9"}` {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if got := stand.seen[2]; got != "POST /rest/v1/user_conversations?select=id|Bearer session-a|public-key|" {
		t.Errorf("the insert went as %q", got)
	}
	before := len(stand.seen)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("POST", "/api/share/tok/fork", nil))
	if rec.Code != 401 || len(stand.seen) != before {
		t.Errorf("signed out: %d, %d more requests", rec.Code, len(stand.seen)-before)
	}
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("GET", "/api/share/tok", nil))
	if rec.Code != 200 {
		t.Errorf("GET /api/share/tok: %d, want 200", rec.Code)
	}
}
