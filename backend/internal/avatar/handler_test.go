package avatar

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestSlowIncomingBodyIsInterrupted(t *testing.T) {
	h := &Handler{SupabaseURL: fixtureURL, SupabaseKey: fixtureKey, Logger: quiet,
		User: func(*http.Request) (string, string, int) { return "user", "session", 200 }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 100*time.Millisecond)
		defer cancel()
		h.ServeHTTP(w, r.WithContext(ctx))
	}))
	defer server.Close()
	conn, err := net.Dial("tcp", server.Listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
	_, err = io.WriteString(conn, "POST /api/upload-avatar HTTP/1.1\r\nHost: test\r\nContent-Type: multipart/form-data; boundary=slow\r\nContent-Length: 1000\r\n\r\n--slow\r\n")
	if err != nil {
		t.Fatal(err)
	}
	reply, err := http.ReadResponse(bufio.NewReader(conn), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer reply.Body.Close()
	if reply.StatusCode != 500 {
		t.Fatalf("status %d", reply.StatusCode)
	}
}

func TestRedirectsNeverReceiveTheSession(t *testing.T) {
	leaked := false
	other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { leaked = true; w.WriteHeader(200) }))
	defer other.Close()
	first := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, other.URL, http.StatusTemporaryRedirect)
	}))
	defer first.Close()
	h := &Handler{HTTP: first.Client(), SupabaseURL: first.URL, SupabaseKey: "public"}
	_, _, err := h.call(context.Background(), "session-secret", "POST", "/storage/v1/object/x", "image/png", []byte("x"), true)
	if err == nil || leaked {
		t.Fatalf("error %v, redirect reached %v", err, leaked)
	}
}

func TestCancellationStopsCleanupAndKeepsSuccess(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	listed := false
	h := &Handler{User: func(*http.Request) (string, string, int) { return "user", "session", 200 }, SupabaseURL: fixtureURL, SupabaseKey: fixtureKey, Logger: quiet}
	h.HTTP = &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
		body := `{}`
		if strings.Contains(r.URL.RequestURI(), "/list/") {
			listed = true
			cancel()
			<-r.Context().Done()
			return nil, r.Context().Err()
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: http.Header{}, Request: r}, nil
	})}
	data, kind := fixtureBody(t, fixture{File: &fileSpec{Name: "photo.png"}})
	r := httptest.NewRequest("POST", "/api/upload-avatar", bytes.NewReader(data)).WithContext(ctx)
	r.Header.Set("Content-Type", kind)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if !listed || w.Code != 200 {
		t.Fatalf("cleanup started %v, response %d %s", listed, w.Code, w.Body)
	}
}

func TestLogsNeverContainVisitorOrUpstreamData(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{HTTP: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) { return nil, errors.New("secret-token private-url") })}, SupabaseURL: fixtureURL, SupabaseKey: fixtureKey, Logger: slog.New(slog.NewTextHandler(&logs, nil))}
	h.User = func(*http.Request) (string, string, int) { return "private-user", "private-session", 200 }
	data, kind := fixtureBody(t, fixture{File: &fileSpec{Name: "secret-photo.png"}})
	r := httptest.NewRequest("POST", "/api/upload-avatar", bytes.NewReader(data))
	r.Header.Set("Content-Type", kind)
	h.ServeHTTP(httptest.NewRecorder(), r)
	if !strings.Contains(logs.String(), "stage=upload") {
		t.Fatal("failure not logged")
	}
	for _, secret := range []string{"secret-token", "private-url", "private-user", "private-session", "secret-photo"} {
		if strings.Contains(logs.String(), secret) {
			t.Fatalf("logged %s", secret)
		}
	}
}

func TestIdentityAndCallsShareTheBudget(t *testing.T) {
	h := &Handler{SupabaseURL: fixtureURL, SupabaseKey: fixtureKey, Logger: quiet}
	h.User = func(r *http.Request) (string, string, int) {
		d, ok := r.Context().Deadline()
		if !ok || time.Until(d) > Budget {
			t.Error("identity has no route budget")
		}
		return "", "", 401
	}
	r := httptest.NewRequest("POST", "/api/upload-avatar", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 401 {
		t.Fatal(w.Code)
	}
}

func TestMultipartRequestBodyIsBounded(t *testing.T) {
	r := httptest.NewRequest("POST", "/api/upload-avatar", strings.NewReader(strings.Repeat("x", MaxBodyBytes+1)))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	_, _, _, _, err := readAvatar(httptest.NewRecorder(), r)
	var limit *http.MaxBytesError
	if !errors.As(err, &limit) {
		t.Fatalf("expected body bound, got %v", err)
	}
}

func TestPublicURLURIEncoding(t *testing.T) {
	// Node encodeURI reference values. Reserved URI separators stay intact.
	for _, tt := range []struct{ in, want string }{{"https://p.test/a b/日本.png", "https://p.test/a%20b/%E6%97%A5%E6%9C%AC.png"}, {"https://p.test/a%20.png?x=1#frag", "https://p.test/a%2520.png?x=1#frag"}} {
		if got := encodeURI(tt.in); got != tt.want {
			t.Errorf("%q want %q", got, tt.want)
		}
	}
}
