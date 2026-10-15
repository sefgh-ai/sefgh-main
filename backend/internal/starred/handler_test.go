package starred

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// handlerWith returns a handler whose user is always "user-a" with token
// "session-a"; database answers the Data API and github answers GitHub.
func handlerWith(database, github roundTrip) *Handler {
	return &Handler{
		User:     func(*http.Request) (string, string, int) { return "user-a", "session-a", 200 },
		Database: &http.Client{Transport: database}, SupabaseURL: "https://project.test", SupabaseKey: "public-key",
		GitHub: &http.Client{Transport: github}, GitHubURL: "https://github.test", Logger: discard,
	}
}

func rows(body string) roundTrip {
	return func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	}
}

func public(r *http.Request) (*http.Response, error) {
	body := fmt.Sprintf(`{"private":false,"description":%q}`, r.URL.Path)
	return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
}

func get(h *Handler) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/repo/starred", nil))
	return w
}

// At most four GitHub reads run at once, as in the Next.js handler, and the
// rows keep the database's order whatever order the reads finish in.
func TestAtMostFourReadsAtOnceAndOrderKept(t *testing.T) {
	var names []string
	for i := range 11 {
		names = append(names, fmt.Sprintf(`{"id":%d,"repo_full_name":"octo/r%d"}`, i, i))
	}
	var mu sync.Mutex
	active, peak := 0, 0
	h := handlerWith(rows("["+strings.Join(names, ",")+"]"), func(r *http.Request) (*http.Response, error) {
		mu.Lock()
		active++
		peak = max(peak, active)
		mu.Unlock()
		// Later rows answer sooner, so finishing order differs from row order.
		time.Sleep(time.Duration(20-len(r.URL.Path)) * time.Millisecond)
		mu.Lock()
		active--
		mu.Unlock()
		return public(r)
	})
	w := get(h)
	var body struct {
		Repos []struct {
			ID       int `json:"id"`
			RepoData struct {
				Description string `json:"description"`
			} `json:"repo_data"`
		} `json:"repos"`
		Count int `json:"count"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil || w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if peak != 4 {
		t.Errorf("%d reads ran at once, want 4", peak)
	}
	for i, repo := range body.Repos {
		if repo.ID != i || repo.RepoData.Description != fmt.Sprintf("/repos/octo/r%d", i) {
			t.Errorf("row %d is %+v", i, repo)
		}
	}
	if body.Count != 11 {
		t.Errorf("count %d, want 11", body.Count)
	}
}

// A redirect could take the request elsewhere; it is not followed, and the
// row gets no metadata.
func TestGitHubRedirectsAreNotFollowed(t *testing.T) {
	asked := 0
	h := handlerWith(rows(`[{"repo_full_name":"old/name"}]`), func(r *http.Request) (*http.Response, error) {
		asked++
		return &http.Response{StatusCode: 301, Header: http.Header{"Location": {"https://github.test/repos/new/name"}}, Body: io.NopCloser(strings.NewReader(`{}`)), Request: r}, nil
	})
	w := get(h)
	if asked != 1 || !strings.Contains(w.Body.String(), `"repo_data":null`) {
		t.Errorf("asked %d times; %s", asked, w.Body)
	}
}

func TestEveryCallHasADeadline(t *testing.T) {
	check := func(name string) roundTrip {
		return func(r *http.Request) (*http.Response, error) {
			if deadline, ok := r.Context().Deadline(); !ok || time.Until(deadline) > 10*time.Second {
				t.Errorf("%s call without a deadline of at most 10s", name)
			}
			if name == "database" {
				return rows(`[{"repo_full_name":"a/b"}]`)(r)
			}
			return public(r)
		}
	}
	if w := get(handlerWith(check("database"), check("GitHub"))); w.Code != 200 {
		t.Errorf("%d %s", w.Code, w.Body)
	}
}

// The log says what failed and nothing about who asked or what the
// database said.
func TestFailuresAreFixedSentencesAndQuietLogs(t *testing.T) {
	var log bytes.Buffer
	h := handlerWith(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 403, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"message":"permission denied for user-a"}`)), Request: r}, nil
	}, public)
	h.Logger = slog.New(slog.NewTextHandler(&log, nil))
	w := get(h)
	if w.Code != 500 || strings.TrimSpace(w.Body.String()) != `{"error":"Failed to fetch starred repositories"}` || w.Header().Get("Cache-Control") != "" {
		t.Errorf("%d %v %s", w.Code, w.Header(), w.Body)
	}
	for _, secret := range []string{"user-a", "session-a", "permission denied"} {
		if strings.Contains(log.String(), secret) {
			t.Errorf("the log contains %q: %s", secret, log.String())
		}
	}
}

// Rows of other kinds are spread as {...repo} spreads them; a null row
// makes the Next.js handler throw. PostgREST sends objects, so these are
// checked only to keep Go from failing differently.
func TestRowsOfOtherKinds(t *testing.T) {
	tests := []struct {
		name, data string
		status     int
		body       string
	}{
		{"a null row throws", `[null]`, 500, `{"error":"Internal server error"}`},
		{"rows as text throw", `"abc"`, 500, `{"error":"Internal server error"}`},
		{"rows as an object are no rows", `{"a":1}`, 200, `{"repos":[],"count":0}`},
		{"empty text is no rows", `""`, 200, `{"repos":[],"count":0}`},
		{"a number row has no fields", `[7, true]`, 200, `{"repos":[{"repo_data":null},{"repo_data":null}],"count":2}`},
		{"a list row is fields by index", `[["x",1]]`, 200, `{"repos":[{"0":"x","1":1,"repo_data":null}],"count":1}`},
		{"a text row is one field per unit", `["hé"]`, 200, `{"repos":[{"0":"h","1":"é","repo_data":null}],"count":1}`},
		{"a stored repo_data keeps its place", `[{"a":1,"repo_data":{"old":true},"b":2}]`, 200, `{"repos":[{"a":1,"repo_data":null,"b":2}],"count":1}`},
	}
	for _, tt := range tests {
		w := get(handlerWith(rows(tt.data), public))
		if w.Code != tt.status || w.Body.String() != tt.body {
			t.Errorf("%s: %d %s; want %d %s", tt.name, w.Code, w.Body, tt.status, tt.body)
		}
	}
}

func TestSignInFailuresAreAll401(t *testing.T) {
	for _, status := range []int{401, 403, 503} {
		h := handlerWith(func(*http.Request) (*http.Response, error) {
			t.Error("the database was asked without a user")
			return nil, nil
		}, public)
		h.User = func(*http.Request) (string, string, int) { return "", "", status }
		if w := get(h); w.Code != 401 || w.Body.String() != `{"error":"Unauthorized"}` {
			t.Errorf("sign-in status %d: %d %s", status, w.Code, w.Body)
		}
	}
}

// A slow GitHub cannot hold the reply past the budget: unchecked rows get
// no metadata, and the reply still comes.
func TestRefreshBudgetBoundsSlowGitHub(t *testing.T) {
	var names []string
	for i := range 9 {
		names = append(names, fmt.Sprintf(`{"repo_full_name":"slow/r%d"}`, i))
	}
	h := handlerWith(rows("["+strings.Join(names, ",")+"]"), func(r *http.Request) (*http.Response, error) {
		<-r.Context().Done()
		return nil, r.Context().Err()
	})
	h.Budget = 60 * time.Millisecond
	started := time.Now()
	w := get(h)
	if took := time.Since(started); took > 2*time.Second {
		t.Errorf("took %v with a 60ms budget", took)
	}
	if w.Code != 200 || strings.Count(w.Body.String(), `"repo_data":null`) != 9 {
		t.Errorf("%d %s", w.Code, w.Body)
	}
}
