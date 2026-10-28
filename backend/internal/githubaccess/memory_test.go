package githubaccess

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

// identityServer stands in for Supabase Auth and GitHub's /user, counting
// what it is asked. Session "refused" is answered 401.
func identityServer(t *testing.T) (*httptest.Server, func() (supabase, github int)) {
	t.Helper()
	var mu sync.Mutex
	supabase, github := 0, 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/auth/v1/user":
			supabase++
			if r.Header.Get("Authorization") == "Bearer refused" {
				w.WriteHeader(401)
				fmt.Fprint(w, `{}`)
				return
			}
			fmt.Fprint(w, `{"id":"user-a","identities":[{"provider":"github","id":"101"}]}`)
		case "/user":
			github++
			fmt.Fprint(w, `{"id":101}`)
		}
	}))
	t.Cleanup(server.Close)
	return server, func() (int, int) {
		mu.Lock()
		defer mu.Unlock()
		return supabase, github
	}
}

func signedIn(session, token string) *http.Request {
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer "+session)
	if token != "" {
		r.Header.Set("X-GitHub-Token", token)
	}
	return r
}

// R-042: Supabase's answer about a session is remembered for a minute, so
// the same session is checked once; a refused one is checked every time.
func TestMemoryRemembersASessionForAMinute(t *testing.T) {
	if MemoryFor != 60*time.Second {
		t.Fatalf("MemoryFor is %v; the owner chose about 60 seconds (R-042)", MemoryFor)
	}
	server, asked := identityServer(t)
	memory := NewMemory()
	now := time.Unix(0, 0)
	memory.now = func() time.Time { return now }
	v := Verifier{SupabaseURL: server.URL, SupabaseKey: "public-key", GitHubURL: server.URL, Memory: memory}

	for i := 0; i < 3; i++ {
		if id, _, status := v.User(signedIn("session-a", "")); status != 200 || id != "user-a" {
			t.Fatalf("request %d: %q %d", i+1, id, status)
		}
	}
	if supabase, _ := asked(); supabase != 1 {
		t.Fatalf("Supabase was asked %d times within a minute, want 1", supabase)
	}
	now = now.Add(MemoryFor)
	v.User(signedIn("session-a", ""))
	if supabase, _ := asked(); supabase != 2 {
		t.Fatalf("after %v Supabase was asked %d times in all, want 2", MemoryFor, supabase)
	}
	for i := 0; i < 2; i++ {
		if _, _, status := v.User(signedIn("refused", "")); status != 401 {
			t.Fatalf("refused session: %d", status)
		}
	}
	if supabase, _ := asked(); supabase != 4 {
		t.Fatalf("a refused session must be checked every time: Supabase asked %d times in all, want 4", supabase)
	}
	for key := range memory.entries {
		if key == memoryKey("supabase", "refused") {
			t.Fatal("a refused session was remembered")
		}
	}
}

// A GitHub token is checked every time, so a revoked one is refused at once
// (contracts/github-access/isolation.json); only the session is remembered.
func TestGitHubTokenIsCheckedEveryTime(t *testing.T) {
	server, asked := identityServer(t)
	v := Verifier{SupabaseURL: server.URL, SupabaseKey: "public-key", GitHubURL: server.URL, Memory: NewMemory()}
	for i := 0; i < 2; i++ {
		if token, status := v.Resolve(signedIn("session-a", "gh-a")); status != 200 || token != "gh-a" {
			t.Fatalf("request %d: %q %d", i+1, token, status)
		}
	}
	if supabase, github := asked(); supabase != 1 || github != 2 {
		t.Fatalf("Supabase asked %d times, GitHub %d; want 1 and 2", supabase, github)
	}
}

// The memory never holds more than memoryMax answers.
func TestMemoryStaysBounded(t *testing.T) {
	memory := NewMemory()
	for i := 0; i < memoryMax+50; i++ {
		memory.keep(memoryKey("supabase", fmt.Sprint("session-", i)), map[string]any{"id": "x"})
	}
	if len(memory.entries) > memoryMax {
		t.Fatalf("%d answers kept, more than %d", len(memory.entries), memoryMax)
	}
}

// A Verifier without Memory asks every time, as the shared fixtures expect.
func TestNoMemoryAsksEveryTime(t *testing.T) {
	server, asked := identityServer(t)
	v := Verifier{SupabaseURL: server.URL, SupabaseKey: "public-key", GitHubURL: server.URL}
	v.User(signedIn("session-a", ""))
	v.User(signedIn("session-a", ""))
	if supabase, _ := asked(); supabase != 2 {
		t.Fatalf("Supabase asked %d times, want 2", supabase)
	}
}
