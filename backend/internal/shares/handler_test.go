package shares

import (
	"bytes"
	"crypto/tls"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func signedIn(*http.Request) (string, string, int) {
	return "0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b", "session-a", 200
}

// A body over MaxBodyBytes is answered 500, and the database is not asked.
func TestLongBodyIsRefused(t *testing.T) {
	asked := false
	h := &Conversation{
		User: signedIn,
		Database: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
			asked = true
			return nil, errors.New("stop")
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
	}
	mux := http.NewServeMux()
	mux.Handle("POST /api/conversations/{id}/share", h)
	body := `{"title":"` + strings.Repeat("x", MaxBodyBytes) + `"}`
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("POST", "/api/conversations/c1/share", strings.NewReader(body)))
	if w.Code != 500 || w.Body.String() != `{"error":"Internal server error"}` || asked {
		t.Errorf("%d %s, database asked: %v", w.Code, w.Body, asked)
	}
}

// The log names the stage and the status, never the user, the visitor's
// token, the conversation, the share's token or the database's own words.
func TestLogsKeepTheVisitorOut(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	user := func(*http.Request) (string, string, int) { return "user-secret-1", "session-secret-2", 200 }
	failing := &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		return nil, errors.New("dial failed for " + r.URL.String())
	})}
	mux := http.NewServeMux()
	mux.Handle("POST /api/conversations/{id}/share", &Conversation{User: user, Database: failing, SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: logger})
	mux.Handle("POST /api/share/{token}/fork", &Fork{User: user, Database: failing, SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: logger})
	for _, target := range []string{"/api/conversations/conversation-secret-3/share", "/api/share/token-secret-4/fork"} {
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, httptest.NewRequest("POST", target, strings.NewReader(`{"title":"title-secret-5"}`)))
		if w.Code != 404 {
			t.Errorf("%s: status %d, want 404", target, w.Code)
		}
	}
	text := logs.String()
	if strings.Count(text, "error=transport") != 2 {
		t.Errorf("the failures were not logged: %q", text)
	}
	for _, secret := range []string{"user-secret-1", "session-secret-2", "conversation-secret-3", "token-secret-4", "title-secret-5"} {
		if strings.Contains(text, secret) {
			t.Errorf("the log holds %q: %s", secret, text)
		}
	}
}

// Without SiteURL the link starts with the request's origin: the forwarded
// host and scheme when a proxy sends them, and otherwise the request's own.
func TestOrigin(t *testing.T) {
	plain := httptest.NewRequest("POST", "http://go.internal:8787/x", nil)
	secure := httptest.NewRequest("POST", "https://go.internal/x", nil)
	secure.TLS = &tls.ConnectionState{}
	proxied := httptest.NewRequest("POST", "http://go.internal:8787/x", nil)
	proxied.Header.Set("X-Forwarded-Host", "sefgh.test, inner.test")
	proxied.Header.Set("X-Forwarded-Proto", "https, http")
	hostOnly := httptest.NewRequest("POST", "http://go.internal:8787/x", nil)
	hostOnly.Header.Set("X-Forwarded-Host", "sefgh.test")
	tests := []struct {
		name    string
		siteURL string
		r       *http.Request
		want    string
	}{
		{"the setting wins", "https://www.sefgh.test/", proxied, "https://www.sefgh.test/"},
		{"the request's own", "", plain, "http://go.internal:8787"},
		{"over TLS", "", secure, "https://go.internal"},
		{"forwarded host and scheme, the first of each", "", proxied, "https://sefgh.test"},
		{"a forwarded host alone, as Next.js's proxy sends it", "", hostOnly, "http://sefgh.test"},
	}
	for _, tt := range tests {
		if got := (&Conversation{SiteURL: tt.siteURL}).origin(tt.r); got != tt.want {
			t.Errorf("%s: origin = %q, want %q", tt.name, got, tt.want)
		}
	}
}
