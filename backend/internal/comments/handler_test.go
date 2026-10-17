package comments

import (
	"bytes"
	"encoding/json"
	"errors"
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

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func signedIn(*http.Request) (string, string, json.RawMessage, int) {
	return "0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b", "session-a", json.RawMessage(`"a@example.test"`), 200
}

func reply(r *http.Request, status int, body string) *http.Response {
	return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}
}

// twenty comments by different authors, as the comment list answers them.
func twenty() string {
	var rows []string
	for i := 0; i < 20; i++ {
		rows = append(rows, fmt.Sprintf(`{"id":"c%d","user_id":"00000000-0000-4000-8000-%012d"}`, i, i))
	}
	return "[" + strings.Join(rows, ",") + "]"
}

// At most four comments have their details read at once; the Next.js
// handler starts them all together.
func TestDetailsRunFourAtATime(t *testing.T) {
	var mu sync.Mutex
	running, most := 0, 0
	h := &Handler{
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			if strings.Contains(r.URL.RawQuery, "repo_full_name=") {
				return reply(r, 200, twenty()), nil
			}
			if strings.HasPrefix(r.URL.Path, "/rest/v1/profiles") {
				mu.Lock()
				running++
				if running > most {
					most = running
				}
				mu.Unlock()
				time.Sleep(20 * time.Millisecond)
				mu.Lock()
				running--
				mu.Unlock()
			}
			return reply(r, 403, `{}`), nil
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/repo/comments?repo=octo/demo", nil))
	if w.Code != 200 || strings.Count(w.Body.String(), `"reply_count"`) != 20 {
		t.Fatalf("%d %.200s", w.Code, w.Body)
	}
	if most > concurrency {
		t.Errorf("%d comments were read at once, more than %d", most, concurrency)
	}
}

// One budget bounds every comment's details together. Here every profile
// read hangs: when the budget runs out the reads count as failed, and the
// reply still comes, quickly, with no names and no replies.
func TestDetailsBudgetBoundsHangingReads(t *testing.T) {
	h := &Handler{
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			if strings.Contains(r.URL.RawQuery, "repo_full_name=") {
				return reply(r, 200, twenty()), nil
			}
			<-r.Context().Done()
			return nil, r.Context().Err()
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
		DetailsBudget: 50 * time.Millisecond,
	}
	start := time.Now()
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/repo/comments?repo=octo/demo", nil))
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Errorf("the reply took %v", elapsed)
	}
	if w.Code != 200 || strings.Count(w.Body.String(), `"user_name":null`) != 20 || strings.Count(w.Body.String(), `"reply_count":0`) != 20 {
		t.Errorf("%d %.300s", w.Code, w.Body)
	}
}

// A body over MaxBodyBytes is answered as one that cannot be read: 500, and
// the database is not asked.
func TestLongBodyIsRefused(t *testing.T) {
	asked := false
	h := &Handler{
		User: signedIn,
		Database: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
			asked = true
			return nil, errors.New("stop")
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
	}
	body := `{"repoFullName":"octo/demo","commentText":"` + strings.Repeat("x", MaxBodyBytes) + `"}`
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/repo/comments", strings.NewReader(body)))
	if w.Code != 500 || w.Body.String() != `{"error":"Internal server error"}` || asked {
		t.Errorf("%d %s, database asked: %v", w.Code, w.Body, asked)
	}
}

// The log names the stage and the status, never the user, the comment's
// text, the repository or the visitor's token.
func TestLogsKeepTheVisitorOut(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{
		User: func(*http.Request) (string, string, json.RawMessage, int) {
			return "user-secret-1", "session-secret-2", nil, 200
		},
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			return nil, errors.New("dial failed for " + r.URL.String())
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key",
		Logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/repo/comments", strings.NewReader(`{"repoFullName":"octo/repo-secret-3","commentText":"text-secret-4"}`)))
	if w.Code != 500 {
		t.Errorf("status %d, want 500", w.Code)
	}
	text := logs.String()
	if !strings.Contains(text, "stage=insert") {
		t.Errorf("the failure was not logged: %q", text)
	}
	for _, secret := range []string{"user-secret-1", "session-secret-2", "repo-secret-3", "text-secret-4"} {
		if strings.Contains(text, secret) {
			t.Errorf("the log holds %q: %s", secret, text)
		}
	}
}
