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

// shareUpstream stands in for the Data API, and records each call as
// "path?query|Authorization|apikey|Accept".
type shareUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *shareUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.URL.RequestURI()+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("Accept"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	if r.URL.Path == "/rest/v1/shared_conversations" {
		io.WriteString(w, `{"id":"s1","share_token":"tok","is_public":true,"title":"Shared"}`)
		return
	}
	w.WriteHeader(404)
	io.WriteString(w, `{}`)
}

func shareServer(t *testing.T) (http.Handler, *shareUpstream) {
	t.Helper()
	stand := &shareUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), stand
}

// Signed out, the public key is the bearer; signed in, the visitor's own
// token is. Supabase Auth is not asked, and no GitHub credential goes
// anywhere.
func TestShareAsksTheDatabaseAsTheVisitor(t *testing.T) {
	handler, stand := shareServer(t)
	query := "/rest/v1/shared_conversations?select=id%2Cshare_token%2Cis_public%2Ctitle%2Csummary%2Csnapshot%2Cshared_at&share_token=eq.tok&deleted_at=is.null"
	for _, tt := range []struct {
		name, authorization, sent string
	}{
		{"signed out", "", "Bearer public-key"},
		{"signed in", "Bearer session-a", "Bearer session-a"},
	} {
		req := httptest.NewRequest("GET", "/api/share/tok", nil)
		if tt.authorization != "" {
			req.Header.Set("Authorization", tt.authorization)
		}
		req.Header.Set("X-GitHub-Token", "caller-github-token")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"title":"Shared"`) {
			t.Fatalf("%s: %d %s", tt.name, rec.Code, rec.Body)
		}
		if got := rec.Header().Get("X-SEFGH-Backend"); got != "go" {
			t.Errorf("%s: backend header %q", tt.name, got)
		}
		stand.mu.Lock()
		seen := stand.seen
		stand.seen = nil
		stand.mu.Unlock()
		want := []string{query + "|" + tt.sent + "|public-key|application/vnd.pgrst.object+json"}
		if strings.Join(seen, "\n") != strings.Join(want, "\n") {
			t.Errorf("%s: upstream saw\n%s\nwant\n%s", tt.name, strings.Join(seen, "\n"), strings.Join(want, "\n"))
		}
	}
}

// Only GET of one token is served by the share handler. The fork route
// under it has its own handler (SHARE-002): signed out it answers 401, and
// it serves POST only. Neither asks the database.
func TestShareServesOnlyItsOwnRoute(t *testing.T) {
	handler, stand := shareServer(t)
	for _, tt := range []struct {
		method, path string
		status       int
	}{
		{"POST", "/api/share/tok", 405},
		{"POST", "/api/share/tok/fork", 401},
		{"GET", "/api/share/tok/fork", 405},
		{"GET", "/api/share/", 404},
	} {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(tt.method, tt.path, nil))
		if rec.Code != tt.status {
			t.Errorf("%s %s: %d, want %d", tt.method, tt.path, rec.Code, tt.status)
		}
	}
	if len(stand.seen) != 0 {
		t.Errorf("the database was asked: %v", stand.seen)
	}
}
