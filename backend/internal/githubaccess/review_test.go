package githubaccess

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// These tests came from REVIEW-006: each one is a change to Resolve that the
// shared fixtures alone did not notice.

func signedRequest(session, token string) *http.Request {
	r := httptest.NewRequest("GET", "/api/github/search?q=x", nil)
	r.Header.Set("Authorization", "Bearer "+session)
	r.Header.Set("X-GitHub-Token", token)
	return r
}

// issuers answers Supabase with user and GitHub with account, and counts calls.
func issuers(calls *int, user, account string) *http.Client {
	return &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
		*calls++
		body := account
		if strings.HasSuffix(r.URL.Path, "/auth/v1/user") {
			body = user
		}
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}
}

const linkedUser = `{"id":"a","identities":[{"provider":"github","id":"101"}]}`

func TestCredentialsRefusedBeforeAnyCall(t *testing.T) {
	calls := 0
	v := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", GitHubURL: "https://github.test", Client: issuers(&calls, linkedUser, `{"id":101}`)}
	long := strings.Repeat("a", 8193)
	atLimit := strings.Repeat("a", 8192)

	repeated := signedRequest("session-a", "gh-a")
	repeated.Header.Add("Authorization", "Bearer session-b")
	repeatedToken := signedRequest("session-a", "gh-a")
	repeatedToken.Header.Add("X-GitHub-Token", "gh-b")
	refused := map[string]*http.Request{
		"session one character too long": signedRequest(long, "gh-a"),
		"token one character too long":   signedRequest("session-a", long),
		"two Authorization headers":      repeated,
		"two X-GitHub-Token headers":     repeatedToken,
		// Go's (?i) would let these stand for s and k; JavaScript's /i does not.
		// Built from code points so this file stays ASCII.
		"a long s in the session":      signedRequest("ab"+string(rune(0x017F)), "gh-a"),
		"a Kelvin sign in the session": signedRequest(string(rune(0x212A))+"ey", "gh-a"),
	}
	for name, r := range refused {
		if token, status := v.Resolve(r); status != 401 || token != "" {
			t.Errorf("%s: status %d token %q, want 401 and none", name, status, token)
		}
	}
	if calls != 0 {
		t.Errorf("%d identity calls were made for credentials refused on sight", calls)
	}
	// The limit itself is allowed.
	if token, status := v.Resolve(signedRequest(atLimit, "gh-a")); status != 200 || token != "gh-a" {
		t.Errorf("session at the limit: status %d token %q, want 200 and the token", status, token)
	}
}

// Without its configuration the server cannot verify anyone. That is an
// outage, not "public" and not "refused", and nothing is sent anywhere.
func TestMissingConfigurationIsUnavailable(t *testing.T) {
	for name, v := range map[string]Verifier{
		"no project URL": {SupabaseKey: "public-key"},
		"no public key":  {SupabaseURL: "https://auth.test"},
	} {
		calls := 0
		v.Client = issuers(&calls, linkedUser, `{"id":101}`)
		if token, status := v.Resolve(signedRequest("session-a", "gh-a")); status != 503 || token != "" || calls != 0 {
			t.Errorf("%s: status %d token %q calls %d, want 503, none, 0", name, status, token, calls)
		}
	}
}

func TestOversizedIdentityReplyIsUnavailable(t *testing.T) {
	replies := map[string]string{
		"a long field": `{"id":"a","identities":[{"provider":"github","id":"101"}],"padding":"` + strings.Repeat("x", 1<<20) + `"}`,
		// A complete, valid reply followed by white space. Reading stops at
		// the limit, so only the size check can refuse this one.
		"valid JSON followed by white space": linkedUser + strings.Repeat(" ", 1<<20),
	}
	for name, big := range replies {
		calls := 0
		v := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", GitHubURL: "https://github.test", Client: issuers(&calls, big, `{"id":101}`)}
		if token, status := v.Resolve(signedRequest("session-a", "gh-a")); status != 503 || token != "" || calls != 1 {
			t.Errorf("%s: status %d token %q calls %d, want 503, none, 1", name, status, token, calls)
		}
	}
}

// An issuer that never answers is given up on at the deadline.
func TestIdentityDeadline(t *testing.T) {
	if DefaultTimeout != 4*time.Second {
		t.Errorf("DefaultTimeout = %v; src/lib/github/access.js uses 4000 ms and the two must agree", DefaultTimeout)
	}
	v := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", Timeout: 30 * time.Millisecond,
		Client: &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
			<-r.Context().Done()
			return nil, r.Context().Err()
		})}}
	started := time.Now()
	token, status := v.Resolve(signedRequest("session-a", "gh-a"))
	if status != 503 || token != "" {
		t.Errorf("status %d token %q, want 503 and none", status, token)
	}
	if waited := time.Since(started); waited > 2*time.Second {
		t.Errorf("gave up after %v, want about 30ms", waited)
	}
}

// JavaScript reads 101.0 and 1.01e2 as the number 101. So does Go.
func TestGitHubIDWrittenAnotherWay(t *testing.T) {
	for _, account := range []string{`{"id":101.0}`, `{"id":1.01e2}`, "\xef\xbb\xbf" + `{"id":101}`} {
		calls := 0
		v := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", GitHubURL: "https://github.test", Client: issuers(&calls, linkedUser, account)}
		if token, status := v.Resolve(signedRequest("session-a", "gh-a")); status != 200 || token != "gh-a" {
			t.Errorf("%s: status %d token %q, want 200 and the token", account, status, token)
		}
	}
}
