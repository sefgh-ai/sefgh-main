package vote

import (
	"bytes"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// A body over MaxBodyBytes is answered as one that cannot be read: 500, and
// the database is not asked. The Next.js handler has no bound of its own.
func TestLongBodyIsRefused(t *testing.T) {
	asked := false
	h := &Handler{
		User: func(*http.Request) (string, string, int) { return "user-a", "session-a", 200 },
		Database: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
			asked = true
			return nil, errors.New("stop")
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
	}
	body := `{"repoFullName":"octo/demo","voteType":"upvote","pad":"` + strings.Repeat("x", MaxBodyBytes) + `"}`
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/repo/vote", strings.NewReader(body)))
	if w.Code != 500 || w.Body.String() != `{"error":"Internal server error"}` || asked {
		t.Errorf("%d %s, database asked: %v", w.Code, w.Body, asked)
	}
}

// The log names the stage and the database's status, never the user, the
// repository or the visitor's token.
func TestLogsKeepTheVisitorOut(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{
		User: func(*http.Request) (string, string, int) { return "user-secret-1", "session-secret-2", 200 },
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			return nil, errors.New("dial failed for " + r.URL.String())
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key",
		Logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/repo/vote", strings.NewReader(`{"repoFullName":"octo/repo-secret-3","voteType":"upvote"}`)))
	if w.Code != 500 {
		t.Errorf("status %d, want 500", w.Code)
	}
	text := logs.String()
	if !strings.Contains(text, "stage=upsert") {
		t.Errorf("the failure was not logged: %q", text)
	}
	for _, secret := range []string{"user-secret-1", "session-secret-2", "repo-secret-3"} {
		if strings.Contains(text, secret) {
			t.Errorf("the log holds %q: %s", secret, text)
		}
	}
}

// One budget bounds a vote's database calls together. Here the vote is
// stored and the count hangs: when the budget runs out the count fails,
// and the reply is all zeros, quickly.
func TestBudgetBoundsAHangingCount(t *testing.T) {
	h := &Handler{
		User: func(*http.Request) (string, string, int) { return "user-a", "session-a", 200 },
		Database: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			if r.Method == http.MethodGet {
				<-r.Context().Done()
				return nil, r.Context().Err()
			}
			if err := r.Context().Err(); err != nil {
				return nil, err
			}
			return &http.Response{StatusCode: 201, Header: http.Header{}, Body: io.NopCloser(strings.NewReader("")), Request: r}, nil
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: discard,
		Budget: 50 * time.Millisecond,
	}
	start := time.Now()
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/api/repo/vote", strings.NewReader(`{"repoFullName":"octo/demo","voteType":"upvote"}`)))
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Errorf("the reply took %v", elapsed)
	}
	want := `{"success":true,"votes":{"upvotes":0,"downvotes":0,"net_votes":0},"userVote":"upvote"}`
	if w.Code != 200 || w.Body.String() != want {
		t.Errorf("%d %s, want 200 %s", w.Code, w.Body, want)
	}
}
