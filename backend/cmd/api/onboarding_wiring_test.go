package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The onboarding endpoints answer the database call's own result as the
// caller, and nothing is asked signed out.
func TestOnboardingAsTheCaller(t *testing.T) {
	var seen []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.Method+" "+r.URL.RequestURI()+"|"+r.Header.Get("Authorization"))
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/auth/v1/user" {
			if r.Header.Get("Authorization") != "Bearer session-a" {
				w.WriteHeader(401)
				io.WriteString(w, `{}`)
				return
			}
			io.WriteString(w, `{"id":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b"}`)
			return
		}
		io.WriteString(w, `{"current_step":2}`)
	}))
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	handler := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))

	r := httptest.NewRequest("GET", "/api/onboarding?user=0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b", nil)
	r.Header.Set("Authorization", "Bearer session-a")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	if w.Code != 200 || w.Body.String() != `{"data":{"current_step":2},"error":null}` {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if want := "GET /rest/v1/onboarding_data?select=*&user_id=eq.0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b|Bearer session-a"; len(seen) != 2 || seen[1] != want {
		t.Errorf("upstream saw %q", seen)
	}
	before := len(seen)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest("PATCH", "/api/onboarding", strings.NewReader(`{"user":"x","updates":{}}`)))
	if w.Code != 401 || len(seen) != before {
		t.Errorf("signed out: %d, %d more requests", w.Code, len(seen)-before)
	}
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest("DELETE", "/api/onboarding", nil))
	if w.Code != 405 {
		t.Errorf("DELETE: %d, want 405", w.Code)
	}
}
