package videos

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

// twenty videos by different uploaders, as the video list answers them.
func twenty() string {
	var rows []string
	for i := 0; i < 20; i++ {
		rows = append(rows, fmt.Sprintf(`{"id":"v%d","uploaded_by":"00000000-0000-4000-8000-%012d"}`, i, i))
	}
	return "[" + strings.Join(rows, ",") + "]"
}

// At most four videos have their uploader read at once; the Next.js handler
// starts them all together.
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
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/repo/videos?repo=octo/demo", nil))
	if w.Code != 200 || strings.Count(w.Body.String(), `"uploader_avatar"`) != 20 {
		t.Fatalf("%d %.200s", w.Code, w.Body)
	}
	if most > concurrency {
		t.Errorf("%d videos were read at once, more than %d", most, concurrency)
	}
}

// One budget bounds every video's uploader lookups together. Here every
// read after the list hangs until it is cancelled: each must carry the
// budget's deadline, and when it runs out the reads count as failed and the
// reply still comes, with no names and no emails. The deadline is checked
// rather than how fast the reply came, so a busy machine cannot fail this
// test (R-091); without a budget the reply never comes, and the test stops
// waiting after 30 seconds.
func TestDetailsBudgetBoundsHangingReads(t *testing.T) {
	const budget = 50 * time.Millisecond
	var mu sync.Mutex
	unbounded := 0
	h := &Handler{
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			if strings.Contains(r.URL.RawQuery, "repo_full_name=") {
				return reply(r, 200, twenty()), nil
			}
			if deadline, ok := r.Context().Deadline(); !ok || time.Until(deadline) > budget {
				mu.Lock()
				unbounded++
				mu.Unlock()
			}
			<-r.Context().Done()
			return nil, r.Context().Err()
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
		DetailsBudget: budget,
	}
	w := httptest.NewRecorder()
	done := make(chan struct{})
	go func() {
		defer close(done)
		h.ServeHTTP(w, httptest.NewRequest("GET", "/api/repo/videos?repo=octo/demo", nil))
	}()
	select {
	case <-done:
	case <-time.After(30 * time.Second):
		t.Fatal("no reply after 30 seconds: the hanging reads were waited for")
	}
	mu.Lock()
	defer mu.Unlock()
	if unbounded != 0 {
		t.Errorf("%d reads had no deadline within the %v budget", unbounded, budget)
	}
	body := w.Body.String()
	if w.Code != 200 || strings.Count(body, `"uploader_name":null`) != 20 || strings.Contains(body, `"uploader_email"`) {
		t.Errorf("%d %.300s", w.Code, body)
	}
}

// The first video that throws decides the answer, as Promise.all's first
// rejection does, and the lookups still hanging are stopped, not waited
// for until the budget runs out.
func TestFirstFailureStopsTheRest(t *testing.T) {
	rows := `[{"id":"bad","uploaded_by":"not-a-uuid"},` + strings.TrimPrefix(twenty(), "[")
	h := &Handler{
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			if strings.Contains(r.URL.RawQuery, "repo_full_name=") {
				return reply(r, 200, rows), nil
			}
			if strings.Contains(r.URL.RawQuery, "not-a-uuid") {
				return reply(r, 400, `{"message":"invalid input syntax for type uuid"}`), nil
			}
			<-r.Context().Done()
			return nil, r.Context().Err()
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
		DetailsBudget: 10 * time.Second,
	}
	start := time.Now()
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/repo/videos?repo=octo/demo", nil))
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Errorf("the reply took %v; the hanging lookups were not stopped", elapsed)
	}
	if w.Code != 500 || w.Body.String() != `{"error":"Internal server error"}` {
		t.Errorf("%d %s", w.Code, w.Body)
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
	body := `{"repoFullName":"octo/demo","videoUrl":"` + strings.Repeat("x", MaxBodyBytes) + `"}`
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/repo/videos", strings.NewReader(body)))
	if w.Code != 500 || w.Body.String() != `{"error":"Internal server error"}` || asked {
		t.Errorf("%d %s, database asked: %v", w.Code, w.Body, asked)
	}
}

// The log names the stage and the status, never the user, the visitor's
// token, the repository, the video's address or its title.
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
	body := `{"repoFullName":"octo/repo-secret-3","videoUrl":"https://example.test/url-secret-4.mp4","title":"title-secret-5"}`
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/repo/videos", strings.NewReader(body)))
	if w.Code != 500 {
		t.Errorf("status %d, want 500", w.Code)
	}
	text := logs.String()
	if !strings.Contains(text, "stage=insert") {
		t.Errorf("the failure was not logged: %q", text)
	}
	for _, secret := range []string{"user-secret-1", "session-secret-2", "repo-secret-3", "url-secret-4", "title-secret-5"} {
		if strings.Contains(text, secret) {
			t.Errorf("the log holds %q: %s", secret, text)
		}
	}
}

// kind answers the type of every value a request body can hold, and
// throws (ok false) where JavaScript has no includes() or no match().
func TestKind(t *testing.T) {
	tests := []struct {
		in        string
		videoType string
		thumbnail string
		ok        bool
	}{
		{`"https://youtu.be/dQw4w9WgXcQ"`, "youtube", `"https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"`, true},
		{`"https://www.youtube.com/watch?v=short"`, "youtube", `null`, true},
		{`"https://github.com/octo/demo/raw/main/demo.mp4"`, "github", `null`, true},
		{`"https://example.test/clip.mp4"`, "direct", `null`, true},
		{`["x"]`, "direct", `null`, true},
		{`["github.com"]`, "github", `null`, true},
		{`["https://github.com/octo/demo"]`, "direct", `null`, true}, // an item must equal the text
		{`["youtu.be"]`, "", "", false},                              // found, then a list has no match()
		{`42`, "", "", false},
		{`true`, "", "", false},
		{`{"href":"https://youtu.be/dQw4w9WgXcQ"}`, "", "", false},
	}
	for _, tt := range tests {
		videoType, thumbnail, ok := kind(parse(json.RawMessage(tt.in)))
		if ok != tt.ok || videoType != tt.videoType || (ok && string(thumbnail) != tt.thumbnail) {
			t.Errorf("kind(%s) = %q, %s, %v; want %q, %s, %v", tt.in, videoType, thumbnail, ok, tt.videoType, tt.thumbnail, tt.ok)
		}
	}
}
