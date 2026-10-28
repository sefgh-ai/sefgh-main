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

// These two are where Go answers differently from the Next.js handler on
// purpose. They are listed in docs/adr/0002-go-backend.md. GitHub sends
// neither shape; the tests keep the Go behaviour from changing unnoticed.
func TestRecordedDifferencesFromNextJS(t *testing.T) {
	t.Run("a numeric login keeps the digits GitHub sent", func(t *testing.T) {
		// JavaScript would ask for /users/1/repos.
		rec, asked := serve(t, &Handler{}, `{"items":[{"login":1.0}]}`, `[]`)
		if rec.Code != 200 || len(asked) != 1 || asked[0] != "/users/1.0/repos?per_page=100" {
			t.Errorf("status %d, asked %q", rec.Code, asked)
		}
	})
	t.Run("an object reply has no repositories even with a length field", func(t *testing.T) {
		// JavaScript would read length 1, find no first element and answer 500.
		rec, _ := serve(t, &Handler{}, `{"items":[{"login":"a"}]}`, `{"length":1}`)
		var body []map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &body); rec.Code != 200 || err != nil || len(body) != 1 {
			t.Fatalf("status %d, body %s", rec.Code, rec.Body)
		}
		popular, _ := body[0]["popularRepo"].(map[string]any)
		if popular["name"] != "No repositories" {
			t.Errorf("popularRepo = %v", popular)
		}
	})
}

func TestJSString(t *testing.T) {
	// Each "want" is what `${value}` gives in Node for the same JSON.
	tests := []struct{ in, want string }{
		{`"octo"`, "octo"},
		{`null`, "null"},
		{`true`, "true"},
		{`false`, "false"},
		{`123`, "123"},
		{`{}`, "[object Object]"},
		{`{"a":1}`, "[object Object]"},
		{`[]`, ""},
		{`["a","b"]`, "a,b"},
		{`[null,"a",[true,[]],{}]`, ",a,true,,[object Object]"},
	}
	for _, tt := range tests {
		decoder := json.NewDecoder(strings.NewReader(tt.in))
		decoder.UseNumber()
		var value any
		if err := decoder.Decode(&value); err != nil {
			t.Fatal(err)
		}
		if got := jsString(value); got != tt.want {
			t.Errorf("jsString(%s) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

// A request that fails writes exactly one log record: the stage, the cause,
// and not the address that was called.
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
		want      []string
	}{
		{"search cannot be reached", func(*http.Request) (*http.Response, error) { return nil, errors.New("offline") },
			[]string{"stage=search", "offline"}},
		{"search is refused", func(*http.Request) (*http.Response, error) { return reply(403, `{}`) },
			[]string{"stage=search", "GitHub answered 403"}},
		{"search reply is not the expected shape", func(*http.Request) (*http.Response, error) { return reply(200, `[]`) },
			[]string{"stage=search", "no list of items"}},
		{"two of three lookups fail", func(r *http.Request) (*http.Response, error) {
			if isSearch(r) {
				return reply(200, `{"items":[{"login":"a"},{"login":"b"},{"login":"c"}]}`)
			}
			if strings.Contains(r.URL.RequestURI(), "/users/b/") {
				return reply(200, `[]`)
			}
			return nil, errors.New("offline")
		}, []string{"stage=enrichment", "2 of 3 developers failed", "offline"}},
	}
	for _, tt := range tests {
		status, logged := record(tt.transport)
		if status != 500 {
			t.Errorf("%s: status %d, want 500", tt.name, status)
		}
		if strings.Count(logged, "level=ERROR") != 1 {
			t.Errorf("%s: want one error record, got:\n%s", tt.name, logged)
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
