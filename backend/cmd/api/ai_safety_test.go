package main

import (
	"bufio"
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// Exercise the clients built by newHandler, not a copied client policy.
// Both servers have the same host and different ports, an origin change
// where Go's default redirect policy would retain Authorization.
func TestAIProviderRedirectsNeverReceiveCredentialsOrBodies(t *testing.T) {
	for _, provider := range []string{"models", "openai", "anthropic"} {
		t.Run(provider, func(t *testing.T) {
			var leaked atomic.Int32
			capture := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				leaked.Add(1)
				io.WriteString(w, `{"choices":[{"message":{"content":"leaked"}}],"content":[{"text":"leaked"}]}`)
			}))
			defer capture.Close()
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				if r.URL.Path == "/auth/v1/user" {
					io.WriteString(w, `{"id":"user-a"}`)
					return
				}
				switch provider {
				case "models":
					if r.Header.Get("Authorization") != "Bearer models-token" {
						t.Error("missing Models credential")
					}
				case "openai":
					if r.Header.Get("Authorization") != "Bearer openai-token" {
						t.Error("missing OpenAI credential")
					}
				case "anthropic":
					if r.Header.Get("X-Api-Key") != "anthropic-token" {
						t.Error("missing Anthropic credential")
					}
				}
				http.Redirect(w, r, capture.URL+"/capture", http.StatusTemporaryRedirect)
			}))
			defer upstream.Close()
			t.Setenv("NEXT_PUBLIC_SUPABASE_URL", upstream.URL)
			t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
			t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
			t.Setenv("GITHUB_TOKEN", "models-token")
			t.Setenv("SEFGH_AI_MODELS_URL", upstream.URL+"/models")
			t.Setenv("SEFGH_OPENAI_URL", upstream.URL+"/openai")
			t.Setenv("SEFGH_ANTHROPIC_URL", upstream.URL+"/anthropic")
			t.Setenv("OPENAI_API_KEY", "")
			t.Setenv("ANTHROPIC_API_KEY", "")
			path, body := "/api/ai/chat", chatBody
			if provider != "models" {
				path, body = "/api/ai/enhance-query", `{"query":"xylophonic quasar"}`
			}
			if provider == "openai" {
				t.Setenv("OPENAI_API_KEY", "openai-token")
			}
			if provider == "anthropic" {
				t.Setenv("ANTHROPIC_API_KEY", "anthropic-token")
			}
			h := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
			response := postJSON(h, path, body, map[string]string{"Authorization": "Bearer session-a"})
			if response.Code != 500 || leaked.Load() != 0 {
				t.Fatalf("status %d, destination calls %d", response.Code, leaked.Load())
			}
		})
	}
}

// Complete the headers but deliberately never finish the JSON body. The
// shortened parent deadline must interrupt reads in each production handler.
func TestAllAIBodiesHaveAConnectionReadDeadline(t *testing.T) {
	for _, path := range []string{"/api/ai/suggestions", "/api/ai/enhance-query", "/api/ai/chat"} {
		t.Run(path, func(t *testing.T) {
			h, _ := aiServer(t, map[string]string{"GITHUB_TOKEN": "models-token"})
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				ctx, cancel := context.WithTimeout(r.Context(), time.Second)
				defer cancel()
				h.ServeHTTP(w, r.WithContext(ctx))
			}))
			defer server.Close()
			conn, err := net.Dial("tcp", server.Listener.Addr().String())
			if err != nil {
				t.Fatal(err)
			}
			defer conn.Close()
			_ = conn.SetDeadline(time.Now().Add(8 * time.Second))
			_, err = io.WriteString(conn, "POST "+path+" HTTP/1.1\r\nHost: test\r\nAuthorization: Bearer session-a\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n{\"query\":")
			if err != nil {
				t.Fatal(err)
			}
			reply, err := http.ReadResponse(bufio.NewReader(conn), nil)
			if err != nil {
				t.Fatal(err)
			}
			defer reply.Body.Close()
			if reply.StatusCode != 500 {
				t.Fatalf("%d, wanted bounded JSON failure", reply.StatusCode)
			}
			raw, _ := io.ReadAll(reply.Body)
			if !strings.Contains(string(raw), `"error"`) {
				t.Fatal("not a JSON error")
			}
		})
	}
}
