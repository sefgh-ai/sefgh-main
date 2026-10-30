package main

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// upstreamLog stands in for Supabase and GitHub and records the credential on
// every request that is not an identity check.
type upstreamLog struct {
	mu       sync.Mutex
	resource []string // "METHOD path|Authorization"
	redirect bool     // answer resource requests with a redirect
}

func (u *upstreamLog) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	switch r.URL.Path {
	case "/auth/v1/user":
		io.WriteString(w, `{"id":"a","identities":[{"provider":"github","id":"101"}]}`)
		return
	case "/user":
		io.WriteString(w, `{"id":101}`)
		return
	}
	u.mu.Lock()
	u.resource = append(u.resource, r.Method+" "+r.URL.Path+"|"+r.Header.Get("Authorization"))
	redirect := u.redirect
	u.mu.Unlock()
	if redirect && r.URL.Path != "/elsewhere" {
		http.Redirect(w, r, "/elsewhere", http.StatusTemporaryRedirect)
		return
	}
	switch {
	case r.URL.Path == "/graphql":
		io.WriteString(w, `{"data":{"user":{"contributionsCollection":{"contributionCalendar":{"totalContributions":0,"weeks":[]}}}}}`)
	case strings.HasPrefix(r.URL.Path, "/search/"):
		io.WriteString(w, `{"total_count":0,"items":[]}`)
	case strings.HasSuffix(r.URL.Path, "/languages"):
		io.WriteString(w, `{}`)
	case strings.HasSuffix(r.URL.Path, "/readme"):
		io.WriteString(w, `# Demo`)
	case strings.Contains(r.URL.Path, "/contents/"):
		io.WriteString(w, `[]`)
	default:
		fmt.Fprintf(w, `{"id":1,"name":"r","full_name":"o/r","owner":{"login":"o"},"html_url":"https://github.com/o/r","languages_url":"http://%s/repos/o/r/languages"}`, r.Host)
	}
}

func (u *upstreamLog) take() []string {
	u.mu.Lock()
	defer u.mu.Unlock()
	seen := u.resource
	u.resource = nil
	return seen
}

var fiveRoutes = []string{
	"/api/github/search?q=x",
	"/api/github/repo?owner=o&name=r",
	"/api/github/repo/o/r",
	"/api/github/contents/o/r",
	"/api/github/contributions?username=octo",
}

func serverUnderTest(t *testing.T, upstream *upstreamLog) http.Handler {
	t.Helper()
	backend := httptest.NewServer(upstream)
	t.Cleanup(backend.Close)
	t.Setenv("GITHUB_API_URL", backend.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", backend.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	// A decoy. If it ever reaches GitHub, a caller borrowed the owner's access.
	t.Setenv("GITHUB_TOKEN", "owner-private-token-must-never-be-used")
	// Not set here, whatever the shell says; publictoken_wiring_test.go sets it.
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

// The server as run() builds it: a caller without credentials reaches GitHub
// with no credential, a verified caller with only their own, on all five
// routes. The server's own GITHUB_TOKEN reaches GitHub on none.
func TestServerNeverLendsItsOwnToken(t *testing.T) {
	upstream := &upstreamLog{}
	handler := serverUnderTest(t, upstream)
	for _, route := range fiveRoutes {
		for _, signedIn := range []bool{false, true} {
			req := httptest.NewRequest("GET", route, nil)
			want := ""
			if signedIn {
				req.Header.Set("Authorization", "Bearer session-a")
				req.Header.Set("X-GitHub-Token", "gh-a")
				want = "Bearer gh-a"
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			seen := upstream.take()
			// Contributions needs a credential, so without one it asks nothing.
			if len(seen) == 0 && (signedIn || !strings.Contains(route, "contributions")) {
				t.Errorf("%s signedIn=%v: no request reached GitHub (status %d)", route, signedIn, rec.Code)
			}
			for _, call := range seen {
				if got := call[strings.LastIndex(call, "|")+1:]; got != want {
					t.Errorf("%s signedIn=%v: %s carried credential %q, want %q", route, signedIn, call, got, want)
				}
			}
			if signedIn && rec.Code != 200 {
				t.Errorf("%s signed in: status %d, want 200: %s", route, rec.Code, rec.Body)
			}
		}
	}
}

// A verified caller's token never follows a redirect, on any route.
func TestVerifiedRequestsDoNotFollowRedirects(t *testing.T) {
	upstream := &upstreamLog{redirect: true}
	handler := serverUnderTest(t, upstream)
	for _, route := range fiveRoutes {
		req := httptest.NewRequest("GET", route, nil)
		req.Header.Set("Authorization", "Bearer session-a")
		req.Header.Set("X-GitHub-Token", "gh-a")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		seen := upstream.take()
		if len(seen) == 0 {
			t.Errorf("%s: no request reached GitHub", route)
		}
		for _, call := range seen {
			if strings.Contains(call, "/elsewhere") {
				t.Errorf("%s: followed a redirect with the caller's token: %s", route, call)
			}
		}
		if rec.Code == 200 {
			t.Errorf("%s: answered 200 after a redirect", route)
		}
	}
}
