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

// supabaseStandIn answers Supabase Auth and the Data API's activity_logs,
// and records each call as "path|Authorization|apikey|X-GitHub-Token".
type supabaseStandIn struct {
	mu   sync.Mutex
	seen []string
}

func (s *supabaseStandIn) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.URL.Path+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	users := map[string]string{"Bearer session-a": `{"id":"user-a"}`, "Bearer session-guest": `{"id":"user-x","is_anonymous":true}`}
	user, known := users[r.Header.Get("Authorization")]
	switch {
	case r.Header.Get("apikey") != "public-key" || !known:
		w.WriteHeader(401)
		io.WriteString(w, `{}`)
	case r.URL.Path == "/auth/v1/user":
		io.WriteString(w, user)
	case r.URL.Path == "/rest/v1/activity_logs":
		io.WriteString(w, `[{"activity_date":"2026-10-14","activity_count":2}]`)
	default:
		w.WriteHeader(404)
		io.WriteString(w, `{}`)
	}
}

func (s *supabaseStandIn) take() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	seen := s.seen
	s.seen = nil
	return seen
}

func activityServer(t *testing.T) (http.Handler, *supabaseStandIn) {
	t.Helper()
	stand := &supabaseStandIn{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "server-public-token")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), stand
}

func askActivity(handler http.Handler, method string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, "/api/activity", nil)
	for name, value := range headers {
		req.Header.Set(name, value)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

// The database is asked as the caller: their own session and the public
// key, nothing else. No server token and no GitHub token goes anywhere.
func TestActivityAsksTheDatabaseAsTheCaller(t *testing.T) {
	handler, stand := activityServer(t)
	for _, session := range []string{"session-a", "session-guest"} {
		rec := askActivity(handler, "GET", map[string]string{"Authorization": "Bearer " + session, "X-GitHub-Token": "caller-github-token"})
		if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"totalContributions":2`) {
			t.Fatalf("%s: %d %s", session, rec.Code, rec.Body)
		}
		want := []string{
			"/auth/v1/user|Bearer " + session + "|public-key|",
			"/rest/v1/activity_logs|Bearer " + session + "|public-key|",
		}
		if got := stand.take(); strings.Join(got, "\n") != strings.Join(want, "\n") {
			t.Errorf("%s reached\n%q\nwant\n%q", session, got, want)
		}
		if rec.Header().Get("X-Sefgh-Backend") != "go" || rec.Header().Get("Cache-Control") != "" || rec.Header().Get("X-Frame-Options") != "DENY" {
			t.Errorf("%s: headers %v", session, rec.Header())
		}
	}
}

func TestActivityNeedsAUser(t *testing.T) {
	handler, stand := activityServer(t)
	for name, headers := range map[string]map[string]string{
		"no session":                 nil,
		"a GitHub token alone":       {"X-GitHub-Token": "caller-github-token"},
		"a session Supabase refuses": {"Authorization": "Bearer expired"},
	} {
		rec := askActivity(handler, "GET", headers)
		if rec.Code != 401 || strings.TrimSpace(rec.Body.String()) != `{"error":"Unauthorized"}` {
			t.Errorf("%s: %d %s", name, rec.Code, rec.Body)
		}
	}
	for _, call := range stand.take() {
		if !strings.HasPrefix(call, "/auth/v1/user|") {
			t.Errorf("a refused request reached %q", call)
		}
	}
}

func TestActivityAcceptsOnlyGet(t *testing.T) {
	handler, stand := activityServer(t)
	for _, method := range []string{"POST", "PUT", "DELETE"} {
		if rec := askActivity(handler, method, map[string]string{"Authorization": "Bearer session-a"}); rec.Code != 405 {
			t.Errorf("%s: %d, want 405", method, rec.Code)
		}
	}
	if got := stand.take(); len(got) != 0 {
		t.Errorf("a refused method reached %q", got)
	}
	if rec := askActivity(handler, "HEAD", map[string]string{"Authorization": "Bearer session-a"}); rec.Code != 200 {
		t.Errorf("HEAD: %d, want 200 as for GET", rec.Code)
	}
}

func TestActivityWithoutSupabaseSettings(t *testing.T) {
	_, stand := activityServer(t)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", "")
	handler := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	rec := askActivity(handler, "GET", map[string]string{"Authorization": "Bearer session-a"})
	if rec.Code != 500 || strings.TrimSpace(rec.Body.String()) != `{"error":"Internal server error"}` {
		t.Errorf("%d %s", rec.Code, rec.Body)
	}
	if got := stand.take(); len(got) != 0 {
		t.Errorf("without settings, yet %q", got)
	}
}
