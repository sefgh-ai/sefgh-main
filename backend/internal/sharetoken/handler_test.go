package sharetoken

import (
	"bytes"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The bearer is read by githubaccess.SessionToken, the rule every route of
// the server uses. Whatever it refuses is a signed-out visitor: the database
// is asked with the public key, never with what the header held.
func TestWhichTokenReachesTheDatabase(t *testing.T) {
	tests := []struct {
		name    string
		headers []string
		sent    string
	}{
		{"a bearer", []string{"Bearer abc.def.ghi"}, "Bearer abc.def.ghi"},
		{"the scheme in any case", []string{"bearer abc"}, "Bearer abc"},
		{"no header", nil, "Bearer " + fixtureSupabaseKey},
		{"another scheme", []string{"Basic c2VjcmV0"}, "Bearer " + fixtureSupabaseKey},
		{"a space in the token", []string{"Bearer abc def"}, "Bearer " + fixtureSupabaseKey},
		{"two headers", []string{"Bearer abc", "Bearer def"}, "Bearer " + fixtureSupabaseKey},
	}
	for _, tt := range tests {
		var got string
		h := &Handler{
			Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
				got = r.Header.Get("Authorization")
				return nil, errors.New("stop")
			})},
			SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Logger: discard,
		}
		mux := http.NewServeMux()
		mux.Handle("GET /api/share/{token}", h)
		r := httptest.NewRequest(http.MethodGet, "/api/share/abc", nil)
		for _, header := range tt.headers {
			r.Header.Add("Authorization", header)
		}
		mux.ServeHTTP(httptest.NewRecorder(), r)
		if got != tt.sent {
			t.Errorf("%s: the database was asked with %q, want %q", tt.name, got, tt.sent)
		}
	}
}

// The log names the stage and the status, never the visitor's token or the
// share's token, even when the transport's own error text holds the URL.
func TestLogsKeepTokensOut(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			return nil, errors.New("dial failed for " + r.URL.String())
		})},
		SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey,
		Logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	mux := http.NewServeMux()
	mux.Handle("GET /api/share/{token}", h)
	r := httptest.NewRequest(http.MethodGet, "/api/share/link-secret-123", nil)
	r.Header.Set("Authorization", "Bearer visitor-secret-456")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code != 404 {
		t.Errorf("status %d, want 404", w.Code)
	}
	text := logs.String()
	if !strings.Contains(text, "stage=database") {
		t.Errorf("the failure was not logged: %q", text)
	}
	for _, secret := range []string{"link-secret-123", "visitor-secret-456"} {
		if strings.Contains(text, secret) {
			t.Errorf("the log holds %q: %s", secret, text)
		}
	}
}

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
