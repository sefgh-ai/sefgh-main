package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aichat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aienhance"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aisuggestions"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

// aiUpstream stands in for the three AI providers, Supabase Auth and the
// GitHub API, and records every request with the credential it carried.
type aiUpstream struct {
	mu   sync.Mutex
	seen []string // "METHOD path|Authorization|x-api-key", plus "|apikey" when one was sent and "|effort=" for a reasoning_effort
}

func (u *aiUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	call := r.Method + " " + r.URL.Path + "|" + r.Header.Get("Authorization") + "|" + r.Header.Get("X-Api-Key")
	if key := r.Header.Get("apikey"); key != "" {
		call += "|" + key
	}
	var body struct {
		Effort *string `json:"reasoning_effort"`
	}
	if json.NewDecoder(r.Body).Decode(&body) == nil && body.Effort != nil {
		call += "|effort=" + *body.Effort
	}
	u.mu.Lock()
	u.seen = append(u.seen, call)
	u.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch r.URL.Path {
	case "/auth/v1/user":
		users := map[string]string{"Bearer session-a": "user-a", "Bearer session-b": "user-b"}
		if id, known := users[r.Header.Get("Authorization")]; known && r.Header.Get("apikey") == "public-key" {
			io.WriteString(w, `{"id":"`+id+`"}`)
			return
		}
		w.WriteHeader(401)
		io.WriteString(w, `{}`)
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
	for _, name := range []string{"GITHUB_TOKEN", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GITHUB_PUBLIC_READ_TOKEN",
		"SEFGH_AI_PROVIDER", "SEFGH_AI_MODEL", "SEFGH_AI_URL", "SEFGH_AI_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY",
		"SEFGH_AI_REASONING_EFFORT"} {
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
	if err := json.Unmarshal(rec.Body.Bytes(), &reply); err != nil || rec.Code != 200 || reply["source"] != "basic-enhancement" || reply["enhancedQuery"] != "web charts application" {
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
	for _, path := range []string{"/api/ai/suggestions", "/api/ai/enhance-query", "/api/ai/chat"} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest("GET", path, nil)
		req.Header.Set("Authorization", "Bearer session-a")
		handler.ServeHTTP(rec, req)
		if rec.Code != 405 {
			t.Errorf("GET %s: %d, want 405", path, rec.Code)
		}
	}
	if got := upstream.take(); len(got) != 0 {
		t.Errorf("a refused request reached a provider or Supabase: %q", got)
	}
}

const chatBody = `{"messages":[{"role":"user","content":"hi"}]}`

// Chat asks Supabase who is calling, with the caller's session and the
// public key, and then GitHub Models, with the models token. Neither
// credential reaches the other service, and a caller's GitHub token goes
// nowhere.
func TestChatCredentialsGoOnlyToTheirOwnService(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"GITHUB_TOKEN": "models-token"})
	rec := postJSON(handler, "/api/ai/chat", chatBody, map[string]string{"Authorization": "Bearer session-a", "X-GitHub-Token": "gh-user"})
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"response"`) {
		t.Fatalf("signed in: %d %s", rec.Code, rec.Body)
	}
	want := []string{"GET /auth/v1/user|Bearer session-a||public-key", "POST /models|Bearer models-token|"}
	if got := upstream.take(); strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Errorf("chat reached\n%q\nwant\n%q", got, want)
	}
	if rec.Header().Get("X-Sefgh-Backend") != "go" || rec.Header().Get("Cache-Control") != "" {
		t.Errorf("headers: %v", rec.Header())
	}
}

// Without a session nothing is called at all. A session Supabase refuses
// costs one question to Supabase and no provider call.
func TestChatNeedsASignedInUser(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"GITHUB_TOKEN": "models-token"})
	if rec := postJSON(handler, "/api/ai/chat", chatBody, nil); rec.Code != 401 || !strings.Contains(rec.Body.String(), "Sign in to use chat") {
		t.Errorf("no session: %d %s", rec.Code, rec.Body)
	}
	if got := upstream.take(); len(got) != 0 {
		t.Errorf("no session, yet %q", got)
	}
	if rec := postJSON(handler, "/api/ai/chat", chatBody, map[string]string{"Authorization": "Bearer expired"}); rec.Code != 401 {
		t.Errorf("refused session: %d %s", rec.Code, rec.Body)
	}
	if got := upstream.take(); len(got) != 1 || !strings.HasPrefix(got[0], "GET /auth/v1/user|") {
		t.Errorf("refused session reached %q", got)
	}
	// Without the Supabase settings nobody can be verified: an outage.
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", "")
	unconfigured := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	if rec := postJSON(unconfigured, "/api/ai/chat", chatBody, map[string]string{"Authorization": "Bearer session-a"}); rec.Code != 503 {
		t.Errorf("no Supabase settings: %d %s", rec.Code, rec.Body)
	}
	if got := upstream.take(); len(got) != 0 {
		t.Errorf("no Supabase settings, yet %q", got)
	}
}

// The two counters are different objects. Chat counts by user id and the
// helpers by address, so sharing one would look the same in every request
// above, but the two would then share one memory of 10,000 callers, and
// heavy search traffic could make it forget a chat user's count.
func TestChatHasItsOwnCounter(t *testing.T) {
	mux := aiMux(slog.New(slog.NewTextHandler(io.Discard, nil)), githubaccess.Verifier{})
	handler := func(path string) http.Handler {
		h, _ := mux.Handler(httptest.NewRequest("POST", path, nil))
		return h
	}
	chat, isChat := handler("/api/ai/chat").(*aichat.Handler)
	suggestions, isSuggestions := handler("/api/ai/suggestions").(*aisuggestions.Handler)
	enhance, isEnhance := handler("/api/ai/enhance-query").(*aienhance.Handler)
	if !isChat || !isSuggestions || !isEnhance {
		t.Fatal("an AI route is not served by its package's handler")
	}
	if chat.Limiter == nil || chat.Limiter == suggestions.Limiter || suggestions.Limiter != enhance.Limiter {
		t.Error("chat must have a counter of its own, and the two helpers must share theirs")
	}
}

// Each user has 30 chat requests. Chat's allowance and the search helpers'
// are separate: using up one leaves the other whole.
func TestChatAllowanceIsPerUserAndSeparate(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"GITHUB_TOKEN": "models-token"})
	address := map[string]string{"X-Forwarded-For": "203.0.113.9"}
	for i := 0; i < 30; i++ {
		postJSON(handler, "/api/ai/suggestions", `{"query":"obscure thing"}`, address)
	}
	userA := map[string]string{"Authorization": "Bearer session-a", "X-Forwarded-For": "203.0.113.9"}
	for i := 0; i < 30; i++ {
		if rec := postJSON(handler, "/api/ai/chat", chatBody, userA); rec.Code != 200 {
			t.Fatalf("chat request %d after the search allowance was used: %d", i+1, rec.Code)
		}
	}
	upstream.take()
	if rec := postJSON(handler, "/api/ai/chat", chatBody, userA); rec.Code != 429 {
		t.Errorf("chat request 31: %d, Retry-After %q", rec.Code, rec.Header().Get("Retry-After"))
	} else if seconds, err := strconv.Atoi(rec.Header().Get("Retry-After")); err != nil || seconds < 1 || seconds > 300 {
		t.Errorf("invalid remaining allowance window: %q", rec.Header().Get("Retry-After"))
	}
	// Past the allowance nothing goes upstream: the model is not asked, and
	// Supabase's answer about session-a is remembered (R-042).
	if got := upstream.take(); len(got) != 0 {
		t.Errorf("past the allowance, upstream was asked: %q", got)
	}
	// Another user from the same address still has a whole allowance.
	if rec := postJSON(handler, "/api/ai/chat", chatBody, map[string]string{"Authorization": "Bearer session-b", "X-Forwarded-For": "203.0.113.9"}); rec.Code != 200 {
		t.Errorf("another user: %d", rec.Code)
	}
}

// AI-PROVIDER-001: a free-tier key alone serves all three AI routes, and the
// key goes only to that provider's address.
func TestAFreeProviderKeyServesAllThreeAIRoutes(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"GEMINI_API_KEY": "gemini-key"})
	rec := postJSON(handler, "/api/ai/suggestions", `{"query":"obscure thing"}`, nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"ai-powered"`) {
		t.Fatalf("suggestions: %d %s", rec.Code, rec.Body)
	}
	rec = postJSON(handler, "/api/ai/enhance-query", `{"query":"charts"}`, nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"ai-powered"`) {
		t.Fatalf("enhance-query: %d %s", rec.Code, rec.Body)
	}
	rec = postJSON(handler, "/api/ai/chat", chatBody, map[string]string{"Authorization": "Bearer session-a"})
	if rec.Code != 200 {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	want := []string{"POST /models|Bearer gemini-key|", "POST /models|Bearer gemini-key|", "GET /auth/v1/user|Bearer session-a||public-key", "POST /models|Bearer gemini-key|"}
	if got := upstream.take(); strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Errorf("calls %q, want %q", got, want)
	}
}

// A paid OpenAI key still decides the query helper; chat keeps the free one.
func TestAPaidKeyStillServesTheQueryHelper(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"GEMINI_API_KEY": "gemini-key", "OPENAI_API_KEY": "openai-key"})
	rec := postJSON(handler, "/api/ai/enhance-query", `{"query":"charts"}`, nil)
	if !strings.Contains(rec.Body.String(), "enhanced by openai") {
		t.Fatalf("enhance-query: %d %s", rec.Code, rec.Body)
	}
	if got := upstream.take(); len(got) != 1 || got[0] != "POST /openai|Bearer openai-key|" {
		t.Errorf("enhance-query reached %q", got)
	}
}

// R-214: with OpenRouter, all three AI routes ask for no reasoning, so a
// reasoning model keeps its answer budget for the answer. A paid OpenAI key
// that serves the query helper gets no such field.
func TestOpenRouterAsksForNoReasoning(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"OPENROUTER_API_KEY": "router-key", "SEFGH_AI_MODEL": "nvidia/nemotron-3-ultra-550b-a55b:free"})
	postJSON(handler, "/api/ai/suggestions", `{"query":"obscure thing"}`, nil)
	postJSON(handler, "/api/ai/enhance-query", `{"query":"charts"}`, nil)
	postJSON(handler, "/api/ai/chat", chatBody, map[string]string{"Authorization": "Bearer session-a"})
	want := []string{"POST /models|Bearer router-key||effort=none", "POST /models|Bearer router-key||effort=none", "GET /auth/v1/user|Bearer session-a||public-key", "POST /models|Bearer router-key||effort=none"}
	if got := upstream.take(); strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Errorf("calls %q, want %q", got, want)
	}

	handler, upstream = aiServer(t, map[string]string{"OPENROUTER_API_KEY": "router-key", "SEFGH_AI_MODEL": "m", "OPENAI_API_KEY": "openai-key"})
	postJSON(handler, "/api/ai/enhance-query", `{"query":"charts"}`, nil)
	if got := upstream.take(); len(got) != 1 || got[0] != "POST /openai|Bearer openai-key|" {
		t.Errorf("enhance-query with a paid key reached %q", got)
	}
}

// A half-configured provider calls nobody: the routes use their fallbacks.
func TestAHalfConfiguredProviderCallsNobody(t *testing.T) {
	handler, upstream := aiServer(t, map[string]string{"OPENROUTER_API_KEY": "router-key"})
	suggestions := postJSON(handler, "/api/ai/suggestions", `{"query":"obscure thing"}`, nil)
	enhance := postJSON(handler, "/api/ai/enhance-query", `{"query":"web charts"}`, nil)
	if suggestions.Code != 200 || enhance.Code != 200 || !strings.Contains(enhance.Body.String(), "basic-enhancement") {
		t.Fatalf("%d %s / %d %s", suggestions.Code, suggestions.Body, enhance.Code, enhance.Body)
	}
	for _, call := range upstream.take() {
		if strings.Contains(call, "router-key") {
			t.Errorf("the key was sent without a model: %q", call)
		}
	}
}
