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

func TestDataProxyRegisteredClientRefusesRedirects(t *testing.T) {
	var destinationCalls atomic.Int32
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		destinationCalls.Add(1)
		io.WriteString(w, `[]`)
	}))
	defer destination.Close()
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer session-a" || r.Header.Get("apikey") != "public-key" {
			t.Error("identity changed at origin")
		}
		http.Redirect(w, r, destination.URL+"/capture", http.StatusTemporaryRedirect)
	}))
	defer origin.Close()
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", origin.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	h := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	r := httptest.NewRequest("PATCH", "/api/data/conversations/rest/v1/user_conversations?id=eq.c1", strings.NewReader(`{"title":"private title"}`))
	r.Header.Set("Authorization", "Bearer session-a")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 502 || destinationCalls.Load() != 0 || w.Header().Get("X-Sefgh-Backend") != "go" {
		t.Fatalf("status %d, destination calls %d, headers %v", w.Code, destinationCalls.Load(), w.Header())
	}
}

// Test the registered handlers over real connections: canceling a context
// alone does not release an incoming Body.Read or the server's body drain.
func TestBrowserDataIncomingBodiesRespectEarlierDeadline(t *testing.T) {
	identity := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/v1/user" {
			t.Error("unfinished JSON must not reach the Data API")
		}
		io.WriteString(w, `{"id":"user-a"}`)
	}))
	defer identity.Close()
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", identity.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	h := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, path := range []string{"/api/search-history", "/api/onboarding", "/api/data/notifications/rest/v1/notifications"} {
		t.Run(path, func(t *testing.T) {
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
			_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
			_, err = io.WriteString(conn, "POST "+path+" HTTP/1.1\r\nHost: test\r\nAuthorization: Bearer session-a\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n{\"user\":")
			if err != nil {
				t.Fatal(err)
			}
			reply, err := http.ReadResponse(bufio.NewReader(conn), nil)
			if err != nil {
				t.Fatal(err)
			}
			defer reply.Body.Close()
			if reply.StatusCode != 400 {
				t.Fatalf("status %d, wanted bounded body failure", reply.StatusCode)
			}
		})
	}
}
