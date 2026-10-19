package onboarding

import (
	"bytes"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

const userA, userB = "0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b", "7d6c5b4a-3f2e-4d1c-8b9a-a0b1c2d3e4f5"

func asB(seen *[]string, logger *slog.Logger) *http.ServeMux {
	h := &Handler{
		User: func(*http.Request) (string, string, int) { return userB, "session-b", 200 },
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			*seen = append(*seen, r.Method+" "+r.URL.RequestURI()+" "+r.Header.Get("Authorization"))
			return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"user_id":"` + userB + `"}`)), Request: r}, nil
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: logger,
	}
	mux := http.NewServeMux()
	h.Register(mux)
	return mux
}

// Two-user isolation (ADR-0002, Phase 3): user B naming user A reads,
// creates and changes nothing of A's, and the database is not asked. B's
// own requests carry B's token.
func TestAnotherUsersIDReachesNothing(t *testing.T) {
	var seen []string
	mux := asB(&seen, slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, tt := range []struct{ method, target, body, code string }{
		{"GET", "/api/onboarding?user=" + userA, "", "PGRST116"},
		{"POST", "/api/onboarding", `{"user":"` + userA + `"}`, "42501"},
		{"PATCH", "/api/onboarding", `{"user":"` + userA + `","updates":{"role":"student"}}`, "PGRST116"},
	} {
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, httptest.NewRequest(tt.method, tt.target, strings.NewReader(tt.body)))
		if w.Code != 200 || !strings.Contains(w.Body.String(), `"code":"`+tt.code+`"`) {
			t.Errorf("%s %s: %d %s, want error %s", tt.method, tt.target, w.Code, w.Body, tt.code)
		}
	}
	if len(seen) != 0 {
		t.Errorf("the database was asked: %q", seen)
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("PATCH", "/api/onboarding", strings.NewReader(`{"user":"`+userB+`","updates":{"current_step":2}}`)))
	if w.Code != 200 || len(seen) != 1 || seen[0] != "PATCH /rest/v1/onboarding_data?user_id=eq."+userB+"&select=* Bearer session-b" {
		t.Errorf("B's own update: %d %s, asked %q", w.Code, w.Body, seen)
	}
}

// A body over MaxBodyBytes, or one that is not an object, is refused before
// the database is asked.
func TestBadBodiesAreRefused(t *testing.T) {
	var seen []string
	mux := asB(&seen, slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, body := range []string{
		`{"user":"` + userB + `","updates":{"role":"` + strings.Repeat("x", MaxBodyBytes) + `"}}`,
		`[1]`,
		`{"user":"` + userB + `","updates":"role=admin"}`,
	} {
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, httptest.NewRequest("PATCH", "/api/onboarding", strings.NewReader(body)))
		if w.Code != 400 {
			t.Errorf("%.40s: %d, want 400", body, w.Code)
		}
	}
	if len(seen) != 0 {
		t.Errorf("the database was asked: %q", seen)
	}
}

// The log names the stage and status, never the user, their token or what
// they answered.
func TestLogsKeepTheAnswersOut(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{
		User: func(*http.Request) (string, string, int) { return "user-secret-1", "session-secret-2", 200 },
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			return nil, errors.New("dial failed for " + r.URL.String())
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key",
		Logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	mux := http.NewServeMux()
	h.Register(mux)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("PATCH", "/api/onboarding", strings.NewReader(`{"user":"user-secret-1","updates":{"github_username":"answer-secret-3"}}`)))
	if w.Code != 200 || !strings.Contains(w.Body.String(), "TypeError: fetch failed") {
		t.Errorf("%d %s", w.Code, w.Body)
	}
	text := logs.String()
	if !strings.Contains(text, "stage=update") {
		t.Errorf("the failure was not logged: %q", text)
	}
	for _, secret := range []string{"user-secret-1", "session-secret-2", "answer-secret-3"} {
		if strings.Contains(text, secret) {
			t.Errorf("the log holds %q: %s", secret, text)
		}
	}
}
