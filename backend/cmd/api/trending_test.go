package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

func TestTrendingStaysPublicWithoutForwardingCredentials(t *testing.T) {
	seen := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen <- r.URL.Path + "|" + r.Header.Get("Authorization") + "|" + r.Header.Get("X-GitHub-Token")
		io.WriteString(w, `{"items":[]}`)
	}))
	defer upstream.Close()
	t.Setenv("GITHUB_API_URL", upstream.URL)
	t.Setenv("GITHUB_TOKEN", "must-not-leak")
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	verifier := githubaccess.Verifier{} // no Auth configuration is needed
	h := verifier.Wrap(githubMux(logger, "", nil), func(string) http.Handler {
		t.Error("public trending selected a private handler")
		return http.NotFoundHandler()
	})
	for route, upstreamPath := range map[string]string{"/api/github/trending": "/search/repositories", "/api/github/trending-developers": "/search/users"} {
		req := httptest.NewRequest("GET", route, nil)
		req.Header.Set("Authorization", "Bearer not-a-session")
		req.Header.Set("X-GitHub-Token", "must-not-leak-either")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != 200 || rec.Body.String() != "[]\n" {
			t.Fatalf("got %d %s", rec.Code, rec.Body.String())
		}
		select {
		case call := <-seen:
			if call != upstreamPath+"||" {
				t.Fatalf("unexpected upstream: %q", call)
			}
		default:
			t.Fatal("missing upstream request")
		}
	}
}
