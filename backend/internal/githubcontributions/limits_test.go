package githubcontributions

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// These tests cover what the contract fixtures cannot: limits the Go handler
// adds on purpose, and what it writes to the log.

func serve(h *Handler, target string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
	return rec
}

func stubClient(status int, body string) *http.Client {
	return &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	})}
}

func TestOversizedReplyIsAFailure(t *testing.T) {
	// A reply that would be accepted if it were not padded past the limit.
	valid := `{"data":{"user":{"contributionsCollection":{"contributionCalendar":{"totalContributions":0,"weeks":[]}}}}}`
	if rec := serve(&Handler{Client: stubClient(200, valid), Token: "t", Logger: quietLogger}, "/api/github/contributions?username=octocat"); rec.Code != http.StatusOK {
		t.Fatalf("the unpadded reply should succeed, got %d %s", rec.Code, rec.Body)
	}
	h := &Handler{Client: stubClient(200, valid+strings.Repeat(" ", maxBodyBytes)), Token: "t", Logger: quietLogger}
	rec := serve(h, "/api/github/contributions?username=octocat")
	if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), msgInternal) {
		t.Errorf("got %d %s, want 500 %s", rec.Code, rec.Body, msgInternal)
	}
}

func TestSlowGitHubIsAbandoned(t *testing.T) {
	// The fake GitHub holds every request until the test ends. It cannot rely
	// on noticing that the caller hung up: Go's server only watches for that
	// once the request body has been read.
	release := make(chan struct{})
	github := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-release
	}))
	defer github.Close()
	defer close(release) // runs first, so Close is not left waiting

	h := &Handler{Client: &http.Client{Timeout: 30 * time.Millisecond}, BaseURL: github.URL, Token: "t", Logger: quietLogger}
	start := time.Now()
	rec := serve(h, "/api/github/contributions?username=octocat")
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Errorf("waited %v for a GitHub that never answers", elapsed)
	}
}

func TestCallerWhoLeftGetsNoReply(t *testing.T) {
	h := &Handler{
		Client: &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return nil, r.Context().Err()
		})},
		Token:  "t",
		Logger: quietLogger,
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/github/contributions?username=octocat", nil).WithContext(ctx))
	if rec.Body.Len() != 0 {
		t.Errorf("wrote %q to a caller who had already gone", rec.Body)
	}
}

// A status the handler cannot pass on with a body becomes a plain 500, as the
// Next.js handler's catch block makes it.
func TestStatusThatCannotBePassedOn(t *testing.T) {
	h := &Handler{Client: stubClient(http.StatusNotModified, ""), Token: "t", Logger: quietLogger}
	rec := serve(h, "/api/github/contributions?username=octocat")
	if rec.Code != http.StatusInternalServerError || !strings.Contains(rec.Body.String(), msgInternal) {
		t.Errorf("got %d %s, want 500 %s", rec.Code, rec.Body, msgInternal)
	}
}

func TestLogsNameTheProblemWithoutSecrets(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{
		Client: &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			return nil, io.ErrUnexpectedEOF
		})},
		Token:  "secret-token-value",
		Logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	rec := serve(h, "/api/github/contributions?username=some-user")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	out := logs.String()
	if !strings.Contains(out, "unexpected EOF") {
		t.Errorf("log does not name the cause: %s", out)
	}
	for _, secret := range []string{"secret-token-value", "some-user", "api.github.com"} {
		if strings.Contains(out, secret) {
			t.Errorf("log contains %q: %s", secret, out)
		}
	}
}

func TestMissingTokenIsLogged(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{Logger: slog.New(slog.NewTextHandler(&logs, nil))}
	if rec := serve(h, "/api/github/contributions?username=octocat"); rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if !strings.Contains(logs.String(), "no server token") {
		t.Errorf("a missing token should be logged for the operator: %q", logs.String())
	}
}
