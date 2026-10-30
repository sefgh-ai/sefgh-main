package githubdevelopers

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// serve answers the search with searchBody and every repository lookup with
// reposBody, and returns the reply and the paths that were asked for.
func serve(t *testing.T, h *Handler, searchBody, reposBody string) (*httptest.ResponseRecorder, []string) {
	t.Helper()
	var mu sync.Mutex
	var asked []string
	h.Client = &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		body := reposBody
		if strings.HasPrefix(r.URL.RequestURI(), "/search/") {
			body = searchBody
		} else {
			mu.Lock()
			asked = append(asked, r.URL.RequestURI())
			mu.Unlock()
		}
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/trending-developers", nil))
	return rec, asked
}

// These malformed shapes exercise intentional differences from Next.js.
// R-025 labels an object repository reply unavailable; R-027 skips numeric
// logins. Neither shape is a normal GitHub response.
func TestRecordedDifferencesFromNextJS(t *testing.T) {
	t.Run("a numeric login is skipped before any repository request", func(t *testing.T) {
		// JavaScript would ask for /users/1/repos.
		rec, asked := serve(t, &Handler{}, `{"items":[{"login":1.0}]}`, `[]`)
		if rec.Code != 200 || len(asked) != 0 || rec.Body.String() != "[]\n" {
			t.Errorf("status %d, asked %q", rec.Code, asked)
		}
	})
	t.Run("an object reply is unavailable even with a length field", func(t *testing.T) {
		// JavaScript would read length 1, find no first element and answer 500.
		rec, _ := serve(t, &Handler{}, `{"items":[{"login":"a"}]}`, `{"length":1}`)
		var body []map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &body); rec.Code != 200 || err != nil || len(body) != 1 {
			t.Fatalf("status %d, body %s", rec.Code, rec.Body)
		}
		popular, _ := body[0]["popularRepo"].(map[string]any)
		if popular["name"] != "Repository unavailable" {
			t.Errorf("popularRepo = %v", popular)
		}
	})
}

// Failed searches log one error; incomplete repository enrichment logs one
// fixed warning count. Neither names the address that was called.
func TestFailureIsLoggedOnceWithoutTheURL(t *testing.T) {
	record := func(transport roundTrip) (int, string) {
		var out bytes.Buffer
		h := &Handler{Client: &http.Client{Transport: transport}, Logger: slog.New(slog.NewTextHandler(&out, nil))}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/trending-developers", nil))
		return rec.Code, out.String()
	}
	reply := func(status int, body string) (*http.Response, error) {
		return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
	}
	isSearch := func(r *http.Request) bool { return strings.HasPrefix(r.URL.RequestURI(), "/search/") }
	tests := []struct {
		name      string
		transport roundTrip
		status    int
		level     string
		want      []string
	}{
		{"search cannot be reached", func(*http.Request) (*http.Response, error) { return nil, errors.New("offline") },
			500, "ERROR", []string{"stage=search", "offline"}},
		{"search is refused", func(*http.Request) (*http.Response, error) { return reply(403, `{}`) },
			500, "ERROR", []string{"stage=search", "GitHub answered 403"}},
		{"search reply is not the expected shape", func(*http.Request) (*http.Response, error) { return reply(200, `[]`) },
			500, "ERROR", []string{"stage=search", "no list of items"}},
		{"two of three lookups fail", func(r *http.Request) (*http.Response, error) {
			if isSearch(r) {
				return reply(200, `{"items":[{"login":"a"},{"login":"b"},{"login":"c"}]}`)
			}
			if strings.Contains(r.URL.RequestURI(), "/users/b/") {
				return reply(200, `[]`)
			}
			return nil, errors.New("offline")
		}, 200, "WARN", []string{"stage=enrichment", "failed=2"}},
	}
	for _, tt := range tests {
		status, logged := record(tt.transport)
		if status != tt.status {
			t.Errorf("%s: status %d, want %d", tt.name, status, tt.status)
		}
		if strings.Count(logged, "level=") != 1 || !strings.Contains(logged, "level="+tt.level) {
			t.Errorf("%s: want one %s record, got:\n%s", tt.name, tt.level, logged)
		}
		for _, want := range tt.want {
			if !strings.Contains(logged, want) {
				t.Errorf("%s: log lacks %q:\n%s", tt.name, want, logged)
			}
		}
		if strings.Contains(logged, "api.github.com") || strings.Contains(logged, "/users/") || strings.Contains(logged, "followers") {
			t.Errorf("%s: log names the request:\n%s", tt.name, logged)
		}
	}
	// A request that succeeds, or is refused for its own parameters, logs nothing.
	for _, target := range []string{"/api/github/trending-developers", "/api/github/trending-developers?since=never"} {
		var out bytes.Buffer
		h := &Handler{Logger: slog.New(slog.NewTextHandler(&out, nil)), Client: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
			return reply(200, `{"items":[]}`)
		})}}
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", target, nil))
		if out.Len() != 0 {
			t.Errorf("%s logged: %s", target, out.String())
		}
	}
}
