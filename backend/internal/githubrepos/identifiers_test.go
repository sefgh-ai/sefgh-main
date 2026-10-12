package githubrepos

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestValidOwner(t *testing.T) {
	for _, owner := range []string{"a", "7", "octo", "Octo-Cat", "octo_corp", "a--b", "a-", strings.Repeat("a", 39)} {
		if !validOwner(owner) {
			t.Errorf("validOwner(%q) = false, want true", owner)
		}
	}
	for _, owner := range []string{"", "-octo", "_octo", "oc.to", "a/b", "a b", "a%2Fb", "..", "a\n", "é", strings.Repeat("a", 40)} {
		if validOwner(owner) {
			t.Errorf("validOwner(%q) = true, want false", owner)
		}
	}
}

func TestValidRepoName(t *testing.T) {
	for _, name := range []string{"a", "next.js", ".github", "a..b", "...", "-x", "_x", "A-b_c.d", strings.Repeat("a", 100)} {
		if !validRepoName(name) {
			t.Errorf("validRepoName(%q) = false, want true", name)
		}
	}
	for _, name := range []string{"", ".", "..", "a/b", "a b", "a#b", "a?b", "a%b", "a\\b", "a\n", "日", strings.Repeat("a", 101)} {
		if validRepoName(name) {
			t.Errorf("validRepoName(%q) = true, want false", name)
		}
	}
}

func TestEncodeContentsPath(t *testing.T) {
	accepted := []struct{ in, want string }{
		{"", ""},
		{"src/main.go", "src/main.go"},
		{"a b", "a%20b"},
		{"docs/C#/readme.md", "docs/C%23/readme.md"},
		{"a?ref=x", "a%3Fref%3Dx"},
		{"50%", "50%25"},
		{"%2e%2e/private", "%252e%252e/private"}, // the text "%2e%2e" is a name, not a step up
		{"a..b", "a..b"},
		{"...", "..."},
		{".gitignore", ".gitignore"},
		{"日.txt", "%E6%97%A5.txt"},
	}
	for _, tt := range accepted {
		got, ok := encodeContentsPath(tt.in)
		if !ok || got != tt.want {
			t.Errorf("encodeContentsPath(%q) = %q, %v; want %q, true", tt.in, got, ok, tt.want)
		}
	}
	for _, in := range []string{"..", ".", "a/../b", "a/./b", "./a", "/src", "src/", "a//b", `a\b`, "a\nb", "a\x00b", "a\tb", "a\x7fb"} {
		if got, ok := encodeContentsPath(in); ok {
			t.Errorf("encodeContentsPath(%q) = %q, true; want it rejected", in, got)
		}
	}
}

// An invalid owner, name or path must never cause a request to GitHub, with
// or without a server token. This is the property the validation exists for.
func TestInvalidInputNeverReachesGitHub(t *testing.T) {
	var calls atomic.Int32
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls.Add(1)
		t.Errorf("request sent to GitHub: %s", r.URL)
		return nil, http.ErrHandlerTimeout
	})}
	mux := http.NewServeMux()
	New(client, defaultBaseURL, "server-token").Register(mux)

	for _, target := range []string{
		"/api/github/repo?owner=..&name=..%2Fuser",
		"/api/github/repo?owner=octo&name=..",
		"/api/github/repo?owner=octo&name=a%2Fb",
		"/api/github/repo?owner=octo&name=a%3Fb",
		"/api/github/repo?owner=octo&name=a%23b",
		"/api/github/repo/a%2Fb/demo",
		"/api/github/repo/octo/a%25b",
		"/api/github/contents/a%2Fb/demo",
		"/api/github/contents/octo/demo?path=..",
		"/api/github/contents/octo/demo?path=a%2F..%2F..%2F..%2Fuser",
		"/api/github/contents/octo/demo?path=a%0Ab",
	} {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d, want 400", target, rec.Code)
		}
	}
	if calls.Load() != 0 {
		t.Errorf("%d requests reached GitHub", calls.Load())
	}
}
