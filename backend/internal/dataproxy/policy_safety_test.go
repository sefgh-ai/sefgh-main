package dataproxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

// A table name in another exposed schema must not inherit the public
// schema's policy merely because it has the same spelling.
func TestPolicyOnlyServesPublicSchema(t *testing.T) {
	for _, name := range []string{"Accept-Profile", "Content-Profile"} {
		for _, value := range []string{"private", "public, private"} {
			mux, got := proxy(t, 200, `[]`, nil)
			w := send(mux, "GET", "/api/data/home/rest/v1/projects", "", map[string]string{name: value})
			if w.Code != 403 || len(*got) != 0 {
				t.Errorf("%s=%q: status %d, database calls %d", name, value, w.Code, len(*got))
			}
		}
	}
	for _, name := range []string{"Accept-Profile", "Content-Profile"} {
		mux, got := proxy(t, 200, `[]`, nil)
		r := httptest.NewRequest("GET", "/api/data/home/rest/v1/projects", nil)
		r.Header.Add(name, "public")
		r.Header.Add(name, "private")
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != 403 || len(*got) != 0 {
			t.Fatalf("second %s value was not refused", name)
		}
	}
	for _, headers := range []map[string]string{nil, {"Accept-Profile": "public", "Content-Profile": "public"}} {
		mux, got := proxy(t, 200, `[]`, nil)
		w := send(mux, "GET", "/api/data/home/rest/v1/projects", "", headers)
		if w.Code != 200 || len(*got) != 1 {
			t.Fatalf("public request refused: %d, calls %d", w.Code, len(*got))
		}
	}
}

func TestUpstreamSchemaIsPinnedEvenWithoutBrowserHeaders(t *testing.T) {
	for _, method := range []string{"GET", "HEAD", "POST", "PATCH", "DELETE"} {
		t.Run(method, func(t *testing.T) {
			called := false
			h := &Handler{Policy: DefaultPolicy(), SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
				Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
					called = true
					name := "Content-Profile"
					if method == "GET" || method == "HEAD" {
						name = "Accept-Profile"
					}
					if r.Header.Get(name) != "public" {
						t.Errorf("outgoing %s=%q", name, r.Header.Get(name))
					}
					return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`[]`)), Request: r}, nil
				})}}
			mux := http.NewServeMux()
			h.Register(mux)
			w := send(mux, method, "/api/data/notifications/rest/v1/notifications", `{"title":"test"}`, nil)
			if !called || w.Code != 200 {
				t.Fatalf("request failed: %d, called %v", w.Code, called)
			}
		})
	}
}

// Same host with another port is a different origin, but Go's default
// redirect policy forwards Authorization there. No request may reach it.
func TestRedirectCannotForwardTheCallersTokenOrWrite(t *testing.T) {
	for _, code := range []int{301, 302, 303, 307, 308} {
		t.Run(http.StatusText(code), func(t *testing.T) {
			var destinationCalls atomic.Int32
			destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				destinationCalls.Add(1)
				io.WriteString(w, `[]`)
			}))
			defer destination.Close()
			origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("Authorization") != "Bearer user-token" || r.Header.Get("apikey") != "public-key" {
					t.Error("configured origin did not receive caller identity")
				}
				http.Redirect(w, r, destination.URL+"/capture", code)
			}))
			defer origin.Close()
			client := &http.Client{}
			h := &Handler{Policy: DefaultPolicy(), Client: client, SupabaseURL: origin.URL, SupabaseKey: "public-key", Logger: discard}
			mux := http.NewServeMux()
			h.Register(mux)
			w := send(mux, "POST", "/api/data/notifications/rest/v1/notifications", `{"title":"private message"}`, map[string]string{"Authorization": "Bearer user-token"})
			if w.Code != 502 || destinationCalls.Load() != 0 {
				t.Fatalf("status %d, destination calls %d; body %s", w.Code, destinationCalls.Load(), w.Body)
			}
			if client.CheckRedirect != nil || !strings.Contains(w.Body.String(), `"error"`) && !strings.Contains(w.Body.String(), `"message"`) {
				t.Fatal("shared client mutated or reply not a Data API error")
			}
		})
	}
}
