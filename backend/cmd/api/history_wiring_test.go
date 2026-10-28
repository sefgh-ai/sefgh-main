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

// historyUpstream stands in for Supabase Auth and the Data API, and records
// each call as "METHOD path?query|Authorization|apikey".
type historyUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *historyUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.Method+" "+r.URL.RequestURI()+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/auth/v1/user" && r.Header.Get("Authorization") == "Bearer session-a":
		io.WriteString(w, `{"id":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b"}`)
	case r.URL.Path == "/rest/v1/search_history" && r.Method == "GET":
		io.WriteString(w, `[{"source":"search"},{"source":"chat"}]`)
	case r.URL.Path == "/rest/v1/search_history" && r.Method == "DELETE":
		w.WriteHeader(204)
	default:
		w.WriteHeader(401)
		io.WriteString(w, `{}`)
	}
}

// The search history endpoints ask the database as the caller. The fixed
// path count sits beside the id wildcard, and signed out nothing is asked.
func TestSearchHistoryAsTheCaller(t *testing.T) {
	stand := &historyUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	handler := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	ask := func(method, target, session string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, target, nil)
		if session != "" {
			r.Header.Set("Authorization", "Bearer "+session)
		}
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	user := "0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b"
	if w := ask("GET", "/api/search-history/count?user="+user, "session-a"); w.Code != 200 || w.Body.String() != `{"total":2,"search":1,"chat":1}` {
		t.Fatalf("count: %d %s", w.Code, w.Body)
	}
	if w := ask("DELETE", "/api/search-history/h1", "session-a"); w.Code != 200 || w.Body.String() != "true" {
		t.Fatalf("delete: %d %s", w.Code, w.Body)
	}
	// The second request reuses Supabase's answer about session-a, remembered
	// for githubaccess.MemoryFor (R-042), so Supabase Auth is asked once.
	want := []string{
		"GET /auth/v1/user|Bearer session-a|public-key",
		"GET /rest/v1/search_history?select=source&user_id=eq." + user + "|Bearer session-a|public-key",
		"DELETE /rest/v1/search_history?id=eq.h1|Bearer session-a|public-key",
	}
	if got := strings.Join(stand.seen, "\n"); got != strings.Join(want, "\n") {
		t.Errorf("upstream saw\n%s\nwant\n%s", got, strings.Join(want, "\n"))
	}
	before := len(stand.seen)
	if w := ask("GET", "/api/search-history/count?user="+user, ""); w.Code != 401 || len(stand.seen) != before {
		t.Errorf("signed out: %d, %d more requests", w.Code, len(stand.seen)-before)
	}
	if w := ask("PUT", "/api/search-history", "session-a"); w.Code != 405 {
		t.Errorf("PUT: %d, want 405", w.Code)
	}
}
