package githubtrending

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

// A request that fails writes exactly one log record: the stage, the cause,
// and not the address that was called.
func TestFailureIsLoggedOnceWithoutTheURL(t *testing.T) {
	reply := func(status int, body string) roundTrip {
		return func(*http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
		}
	}
	tests := []struct {
		name      string
		transport roundTrip
		want      []string
	}{
		{"GitHub cannot be reached", func(*http.Request) (*http.Response, error) { return nil, errors.New("offline") },
			[]string{"stage=transport", "offline"}},
		{"GitHub refuses", reply(403, `{}`), []string{"stage=status", "GitHub answered 403"}},
		{"the reply is not JSON", reply(200, `{broken`), []string{"stage=decode"}},
		{"the reply has no items", reply(200, `[]`), []string{"stage=decode", "no list of items"}},
		{"an item has no owner", reply(200, `{"items":[{"name":"x"}]}`), []string{"stage=decode", "owner"}},
	}
	for _, tt := range tests {
		var out bytes.Buffer
		h := &Handler{Client: &http.Client{Transport: tt.transport}, Logger: slog.New(slog.NewTextHandler(&out, nil))}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/trending", nil))
		logged := out.String()
		if rec.Code != 500 {
			t.Errorf("%s: status %d, want 500", tt.name, rec.Code)
		}
		if strings.Count(logged, "level=ERROR") != 1 {
			t.Errorf("%s: want one error record, got:\n%s", tt.name, logged)
		}
		for _, want := range tt.want {
			if !strings.Contains(logged, want) {
				t.Errorf("%s: log lacks %q:\n%s", tt.name, want, logged)
			}
		}
		if strings.Contains(logged, "api.github.com") || strings.Contains(logged, "/search/") || strings.Contains(logged, "stars") {
			t.Errorf("%s: log names the request:\n%s", tt.name, logged)
		}
	}
	// A request that succeeds, or is refused for its own parameters, logs nothing.
	for _, target := range []string{"/api/github/trending", "/api/github/trending?since=never"} {
		var out bytes.Buffer
		h := &Handler{Client: &http.Client{Transport: reply(200, `{"items":[]}`)}, Logger: slog.New(slog.NewTextHandler(&out, nil))}
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", target, nil))
		if out.Len() != 0 {
			t.Errorf("%s logged: %s", target, out.String())
		}
	}
}
