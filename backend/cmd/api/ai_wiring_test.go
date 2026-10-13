package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// aiUpstream stands in for the three AI providers and for the GitHub API,
// and records every request with the credential it carried.
type aiUpstream struct {
	mu   sync.Mutex
	seen []string // "METHOD path|Authorization|x-api-key"
}

func (u *aiUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	u.mu.Lock()
	u.seen = append(u.seen, r.Method+" "+r.URL.Path+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("X-Api-Key"))
	u.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch r.URL.Path {
	case "/models":
		io.WriteString(w, `{"choices":[{"message":{"content":"[\"one\",\"two\",\"three\"]"}}]}`)
	case "/openai":
		io.WriteString(w, `{"choices":[{"message":{"content":"enhanced by openai"}}]}`)
	case "/anthropic":
		io.WriteString(w, `{"content":[{"text":"enhanced by anthropic"}]}`)
	default:
		io.WriteString(w, `{"total_count":0,"items":[]}`)
	}
}

func (u *aiUpstream) take() []string {
	u.mu.Lock()
	defer u.mu.Unlock()
	seen := u.seen
	u.seen = nil
	return seen
}

// aiServer is newHandler, which is what run() serves, with every outside
// address pointed at the stand-in.
func aiServer(t *testing.T, env map[string]string) (http.Handler, *aiUpstream) {
	t.Helper()
	upstream := &aiUpstream{}
	backend := httptest.NewServer(upstream)
	t.Cleanup(backend.Close)
	t.Setenv("GITHUB_API_URL", backend.URL)
	t.Setenv("SEFGH_AI_MODELS_URL", backend.URL+"/models")
	t.Setenv("SEFGH_OPENAI_URL", backend.URL+"/openai")
	t.Setenv("SEFGH_ANTHROPIC_URL", backend.URL+"/anthropic")
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", backend.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	for _, name := range []string{"GITHUB_TOKEN", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"} {
		t.Setenv(name, env[name])
	}
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), upstream
}

func postJSON(handler http.Handler, path, body string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest("POST", path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for name, value := range headers {
		req.Header.Set(name, value)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

// Each AI credential reaches its own provider and nothing else. The models
// token in particular never reaches a GitHub API route, signed in or not.
func TestAICredentialsGoOnlyToTheirOwnProvider(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"GITHUB_TOKEN": "models-token", "OPENAI_API_KEY": "openai-key", "ANTHROPIC_API_KEY": "anthropic-key"})

	rec := postJSON(handler, "/api/ai/suggestions", `{"query":"obscure thing"}`, nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"ai-powered"`) {
		t.Fatalf("suggestions: %d %s", rec.Code, rec.Body)
	}
	if got := upstream.take(); len(got) != 1 || got[0] != "POST /models|Bearer models-token|" {
		t.Errorf("suggestions reached %q", got)
	}

	rec = postJSON(handler, "/api/ai/enhance-query", `{"query":"charts"}`, nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "enhanced by openai") {
		t.Fatalf("enhance-query: %d %s", rec.Code, rec.Body)
	}
	if got := upstream.take(); len(got) != 1 || got[0] != "POST /openai|Bearer openai-key|" {
		t.Errorf("enhance-query reached %q", got)
	}

	// A GitHub API route in the same server: no AI credential, no token at all.
	req := httptest.NewRequest("GET", "/api/github/search?q=x", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	for _, call := range upstream.take() {
		if !strings.HasSuffix(call, "||") {
			t.Errorf("a GitHub API request carried a credential: %q", call)
		}
	}
}

func TestEnhanceUsesAnthropicWithoutAnOpenAIKeyAndNobodyWithoutEither(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"ANTHROPIC_API_KEY": "anthropic-key"})
	rec := postJSON(handler, "/api/ai/enhance-query", `{"query":"charts"}`, nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "enhanced by anthropic") {
		t.Fatalf("with an Anthropic key: %d %s", rec.Code, rec.Body)
	}
	if got := upstream.take(); len(got) != 1 || got[0] != "POST /anthropic||anthropic-key" {
		t.Errorf("enhance-query reached %q", got)
	}

	handler, upstream = aiServer(t, nil)
	rec = postJSON(handler, "/api/ai/enhance-query", `{"query":"web charts"}`, nil)
	var reply map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &reply); err != nil || rec.Code != 200 || reply["source"] != "basic-enhancement" || reply["enhancedQuery"] != "web charts web application" {
		t.Errorf("with no key: %d %s", rec.Code, rec.Body)
	}
	if got := upstream.take(); len(got) != 0 {
		t.Errorf("with no key something was called: %q", got)
	}
}

// The two search helpers share one allowance per address, as in Next.js.
func TestSearchHelpersShareOneAllowance(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"GITHUB_TOKEN": "models-token", "OPENAI_API_KEY": "openai-key"})
	caller := map[string]string{"X-Forwarded-For": "203.0.113.9"}
	for i := 0; i < 15; i++ {
		postJSON(handler, "/api/ai/suggestions", `{"query":"obscure thing"}`, caller)
		postJSON(handler, "/api/ai/enhance-query", `{"query":"charts"}`, caller)
	}
	if got := len(upstream.take()); got != 30 {
		t.Fatalf("%d provider calls for the first 30 requests, want 30", got)
	}
	suggestions := postJSON(handler, "/api/ai/suggestions", `{"query":"obscure thing"}`, caller)
	enhance := postJSON(handler, "/api/ai/enhance-query", `{"query":"web charts"}`, caller)
	if !strings.Contains(suggestions.Body.String(), "predefined-fallback") || !strings.Contains(enhance.Body.String(), "basic-enhancement") {
		t.Errorf("past the allowance: %s and %s", suggestions.Body, enhance.Body)
	}
	if got := upstream.take(); len(got) != 0 {
		t.Errorf("past the allowance a provider was still called: %q", got)
	}
	// Another address is not affected.
	other := postJSON(handler, "/api/ai/suggestions", `{"query":"obscure thing"}`, map[string]string{"X-Forwarded-For": "198.51.100.7"})
	if !strings.Contains(other.Body.String(), "ai-powered") {
		t.Errorf("another address: %s", other.Body)
	}
}

// An Authorization header on an AI route is not a GitHub access attempt.
// Behind the GitHub check, a bearer with no X-GitHub-Token would be 401.
func TestAIRoutesSitBesideTheGitHubCheck(t *testing.T) {
	handler, _ := aiServer(t, nil)
	rec := postJSON(handler, "/api/ai/suggestions", `{"query":"rea"}`, map[string]string{"Authorization": "Bearer session-a"})
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"predefined"`) {
		t.Errorf("suggestions with a bearer: %d %s", rec.Code, rec.Body)
	}
	if rec.Header().Get("X-Sefgh-Backend") != "go" || rec.Header().Get("X-Frame-Options") != "DENY" {
		t.Errorf("AI reply lacks the backend marker or the security headers: %v", rec.Header())
	}
	// The same header on a GitHub route is still refused.
	req := httptest.NewRequest("GET", "/api/github/search?q=x", nil)
	req.Header.Set("Authorization", "Bearer session-a")
	gh := httptest.NewRecorder()
	handler.ServeHTTP(gh, req)
	if gh.Code != 401 {
		t.Errorf("GitHub route with a bearer and no GitHub token: %d, want 401", gh.Code)
	}
}

func TestAIRoutesAcceptOnlyPost(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"GITHUB_TOKEN": "models-token", "OPENAI_API_KEY": "openai-key"})
	for _, path := range []string{"/api/ai/suggestions", "/api/ai/enhance-query"} {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != 405 {
			t.Errorf("GET %s: %d, want 405", path, rec.Code)
		}
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("POST", "/api/ai/chat", strings.NewReader(`{}`)))
	if rec.Code != 404 {
		t.Errorf("POST /api/ai/chat, which is not ported: %d, want 404", rec.Code)
	}
	if got := upstream.take(); len(got) != 0 {
		t.Errorf("a refused request reached a provider: %q", got)
	}
}
