package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// publicReadServer is newHandler with GITHUB_PUBLIC_READ_TOKEN set, every
// outside address pointed at one stand-in, and decoys for the two tokens the
// public read token must never be confused with. scopes is what the stand-in
// says the public token may do; nil sends no X-OAuth-Scopes header.
func publicReadServer(t *testing.T, scopes *string) (http.Handler, *upstreamLog) {
	t.Helper()
	upstream := &upstreamLog{}
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/user" && r.Header.Get("Authorization") == "Bearer public-read" {
			upstream.mu.Lock()
			upstream.resource = append(upstream.resource, "CHECK|"+r.Header.Get("Authorization"))
			upstream.mu.Unlock()
			if scopes != nil {
				w.Header().Set("X-OAuth-Scopes", *scopes)
			}
			io.WriteString(w, `{"id":7}`)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/search/users") {
			upstream.mu.Lock()
			upstream.resource = append(upstream.resource, r.Method+" "+r.URL.Path+"|"+r.Header.Get("Authorization"))
			upstream.mu.Unlock()
			io.WriteString(w, `{"total_count":1,"items":[{"login":"octo"}]}`)
			return
		}
		upstream.ServeHTTP(w, r)
	}))
	t.Cleanup(backend.Close)
	t.Setenv("GITHUB_API_URL", backend.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", backend.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_TOKEN", "owner-private-token-must-never-be-used")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "public-read")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), upstream
}

var signedOutReads = []string{
	"/api/github/search?q=x",
	"/api/github/repo?owner=o&name=r",
	"/api/github/repo/o/r",
	"/api/github/contents/o/r",
	"/api/github/trending?since=daily",
	"/api/github/trending-developers?since=daily",
}

// With a token GitHub confirms has no scopes, every signed-out read carries
// it, and a verified caller's reads carry only that caller's token.
func TestPublicReadTokenGoesOnlyToSignedOutReads(t *testing.T) {
	empty := ""
	handler, upstream := publicReadServer(t, &empty)
	for _, route := range signedOutReads {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest("GET", route, nil))
		seen := upstream.take()
		if len(seen) == 0 {
			t.Errorf("%s: nothing reached GitHub (status %d)", route, rec.Code)
		}
		for _, call := range seen {
			if !strings.HasSuffix(call, "|Bearer public-read") {
				t.Errorf("%s signed out: %s, want the public read token", route, call)
			}
		}
		if rec.Header().Get("Cache-Control") != "" {
			t.Errorf("%s signed out: Cache-Control %q; a public read stays cacheable", route, rec.Header().Get("Cache-Control"))
		}
	}
	for _, route := range fiveRoutes {
		req := httptest.NewRequest("GET", route, nil)
		req.Header.Set("Authorization", "Bearer session-a")
		req.Header.Set("X-GitHub-Token", "gh-a")
		handler.ServeHTTP(httptest.NewRecorder(), req)
		for _, call := range upstream.take() {
			if !strings.HasSuffix(call, "|Bearer gh-a") {
				t.Errorf("%s signed in: %s, want only the caller's token", route, call)
			}
		}
	}
}

// Contributions answers 500 without a caller's token before asking GitHub
// anything, and the public read token does not change that.
func TestPublicReadTokenDoesNotOpenContributions(t *testing.T) {
	empty := ""
	handler, upstream := publicReadServer(t, &empty)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/contributions?username=octo", nil))
	if rec.Code != 500 {
		t.Errorf("contributions signed out: %d, want 500", rec.Code)
	}
	if seen := upstream.take(); len(seen) != 0 {
		t.Errorf("contributions signed out reached %q", seen)
	}
}

// A token with scopes, or one GitHub cannot vouch for, is checked and then
// left out of every read.
func TestPublicReadTokenWithScopesIsNotUsed(t *testing.T) {
	repo := "repo"
	for name, scopes := range map[string]*string{"repo scope": &repo, "no scopes header": nil} {
		handler, upstream := publicReadServer(t, scopes)
		for _, route := range signedOutReads {
			handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", route, nil))
		}
		checks := 0
		for _, call := range upstream.take() {
			if strings.HasPrefix(call, "CHECK|") {
				checks++
				continue
			}
			if !strings.HasSuffix(call, "|") {
				t.Errorf("%s: %s carried a credential", name, call)
			}
		}
		if checks != 1 {
			t.Errorf("%s: %d checks for %d reads inside one minute, want 1", name, checks, len(signedOutReads))
		}
	}
}
