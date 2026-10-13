package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

func TestPrivateRepositoryIsolation(t *testing.T) {
	raw, err := os.ReadFile("../../../contracts/github-access/isolation.json")
	if err != nil {
		t.Fatal(err)
	}
	type step struct {
		ID, User       string
		Revoked        bool
		ResourceStatus int `json:"resource_status"`
		ResourceID     int `json:"resource_id"`
		Status         int
	}
	var fixtures struct{ Cases []step }
	if err = json.Unmarshal(raw, &fixtures); err != nil {
		t.Fatal(err)
	}
	var current step
	var mu sync.Mutex
	resourceCalls := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/auth/v1/user":
			if r.Header.Get("Authorization") != "Bearer session-"+current.User {
				t.Error("wrong Supabase credential")
			}
			id := "101"
			if current.User == "b" {
				id = "102"
			}
			fmt.Fprintf(w, `{"id":%q,"identities":[{"provider":"github","id":%q}]}`, current.User, id)
		case "/user":
			if r.Header.Get("Authorization") != "Bearer gh-"+current.User {
				t.Error("wrong GitHub credential")
			}
			if current.Revoked {
				w.WriteHeader(401)
				fmt.Fprint(w, `{}`)
				return
			}
			id := 101
			if current.User == "b" {
				id = 102
			}
			fmt.Fprintf(w, `{"id":%d}`, id)
		default:
			resourceCalls++
			want := ""
			if current.User != "" {
				want = "Bearer gh-" + current.User
			}
			if r.Header.Get("Authorization") != want {
				t.Error("resource used the wrong user's credential")
			}
			w.WriteHeader(current.ResourceStatus)
			fmt.Fprintf(w, `{"id":%d}`, current.ResourceID)
		}
	}))
	defer upstream.Close()
	t.Setenv("GITHUB_API_URL", upstream.URL)
	t.Setenv("GITHUB_TOKEN", "owner-private-token-must-never-be-used")
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	v := githubaccess.Verifier{SupabaseURL: upstream.URL, SupabaseKey: "public-key", GitHubURL: upstream.URL}
	handler := v.Wrap(githubMux(logger, ""), func(token string) http.Handler { return githubMux(logger, token) })
	// httptest's real socket includes the direct backend surface, not a Next gate.
	server := httptest.NewServer(handler)
	defer server.Close()
	for _, tc := range fixtures.Cases {
		mu.Lock()
		current = tc
		before := resourceCalls
		mu.Unlock()
		req, _ := http.NewRequest("GET", server.URL+"/api/github/repo?owner=org&name=private", nil)
		if tc.User != "" {
			req.Header.Set("Authorization", "Bearer session-"+tc.User)
			req.Header.Set("X-GitHub-Token", "gh-"+tc.User)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != tc.Status {
			t.Fatalf("%s: status %d body %s", tc.ID, res.StatusCode, body)
		}
		if tc.User != "" && res.Header.Get("Cache-Control") != "private, no-store" {
			t.Errorf("%s: missing cache protection", tc.ID)
		}
		if tc.Status == 200 && !strings.Contains(string(body), fmt.Sprintf(`"id":%d`, tc.ResourceID)) {
			t.Errorf("%s: wrong result %s", tc.ID, body)
		}
		wantCalls := 1
		if tc.Revoked {
			wantCalls = 0
		}
		mu.Lock()
		gotCalls := resourceCalls - before
		mu.Unlock()
		if gotCalls != wantCalls {
			t.Errorf("%s: resource requests=%d want %d", tc.ID, gotCalls, wantCalls)
		}
	}
	for _, path := range []string{"/api/github/search?q=x", "/api/github/repo?owner=o&name=r", "/api/github/repo/o/r", "/api/github/contents/o/r", "/api/github/contributions?username=octo"} {
		req := httptest.NewRequest("GET", path, nil)
		req.Header.Set("X-GitHub-Token", "gh-a")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != 401 {
			t.Errorf("unguarded route %s: %d", path, rec.Code)
		}
	}
}
