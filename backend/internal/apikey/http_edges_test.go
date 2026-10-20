package apikey

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubsearch"
)

func httpHarness(t *testing.T, upstream http.Handler) (*HTTP, *Service, *memoryStore, string) {
	t.Helper()
	service, store, _ := setup(t)
	_, raw := issue(t, service, "owner-a")
	if upstream == nil {
		upstream = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = io.WriteString(w, `{"total_count":0,"items":[]}`) })
	}
	server := httptest.NewServer(upstream)
	t.Cleanup(server.Close)
	h, err := NewHTTP(func(_ context.Context, bearer string) (string, Manager, error) {
		if bearer == "session-a" {
			return "owner-a", service, nil
		}
		return "", nil, ErrOwner
	}, service, HTTPOptions{GitHubURL: server.URL, SaveRecovery: func(context.Context, Completion) error { return nil }})
	if err != nil {
		t.Fatal(err)
	}
	return h, service, store, raw
}

type failingTransport struct{}

func (failingTransport) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("synthetic-private-transport-error")
}

func TestKnownDefectDetailedSearchLoggerAndNewAdapterIsolation(t *testing.T) {
	var legacyLog bytes.Buffer
	legacy := &githubsearch.Handler{Client: &http.Client{Transport: failingTransport{}}, Logger: slog.New(slog.NewTextHandler(&legacyLog, nil))}
	legacy.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/api/github/search?q=synthetic-sensitive-query", nil))
	// R136 is deliberately recorded, not fixed in the original route here.
	if !strings.Contains(legacyLog.String(), "synthetic-sensitive-query") {
		t.Fatal("recheck R136: original logger behavior changed")
	}
	h, _, _, raw := httpHarness(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(500) }))
	var observed bytes.Buffer
	prior := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&observed, nil)))
	defer slog.SetDefault(prior)
	w := httpCall(h, "GET", "/api/v1/search?q=synthetic-sensitive-query", raw, "")
	if w.Code != 500 || observed.Len() != 0 || strings.Contains(w.Body.String(), "synthetic-sensitive-query") {
		t.Fatal("new adapter exposed provider detail", w.Code, observed.String(), w.Body)
	}
}

type timeoutBody struct{}

func (timeoutBody) Read([]byte) (int, error) { return 0, bodyTimeout{} }
func (timeoutBody) Close() error             { return nil }

type bodyTimeout struct{}

func (bodyTimeout) Error() string   { return "synthetic-private-body-error" }
func (bodyTimeout) Timeout() bool   { return true }
func (bodyTimeout) Temporary() bool { return true }

func TestHTTPReadTimeoutDoesNotDependOnContextTimerOrder(t *testing.T) {
	h, _, store, _ := httpHarness(t, nil)
	r := httptest.NewRequest("POST", "/api/v1/keys", nil)
	r.Body = timeoutBody{}
	r.Header.Set("Authorization", "Bearer session-a")
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 504 || strings.Contains(w.Body.String(), "synthetic-private") {
		t.Fatal("timeout misclassified", w.Code, w.Body)
	}
	if store.createCalls != 1 {
		t.Fatal("timed out body reached creation")
	}
}

func TestHTTPAmbientCookieJarIsNotUsedOrMutated(t *testing.T) {
	service, _, _ := setup(t)
	_, raw := issue(t, service, "owner-a")
	var cookie atomic.Bool
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie.Store(r.Header.Get("Cookie") != "")
		_, _ = io.WriteString(w, `{"total_count":0,"items":[]}`)
	}))
	defer upstream.Close()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	target, err := http.NewRequest("GET", upstream.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	jar.SetCookies(target.URL, []*http.Cookie{{Name: "ambient-session", Value: "synthetic-private-session"}})
	client := &http.Client{Jar: jar}
	prior := http.DefaultClient
	http.DefaultClient = client
	defer func() { http.DefaultClient = prior }()
	h, err := NewHTTP(func(context.Context, string) (string, Manager, error) { return "", nil, ErrOwner }, service, HTTPOptions{GitHubURL: upstream.URL, SaveRecovery: func(context.Context, Completion) error { return nil }})
	if err != nil {
		t.Fatal(err)
	}
	w := httpCall(h, "GET", "/api/v1/search?q=go", raw, "")
	if w.Code != 200 || cookie.Load() || client.Jar != jar || len(jar.Cookies(target.URL)) != 1 {
		t.Fatal("ambient cookie leak or caller mutation", w.Code, cookie.Load())
	}
}

func httpCall(h *HTTP, method, path, token, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestHTTPBoundedInputsAndEntropyFailBeforeAdmission(t *testing.T) {
	h, _, store, raw := httpHarness(t, nil)
	if w := httpCall(h, "POST", "/api/v1/keys", "session-a", strings.Repeat(" ", MaxHTTPBody+1)); w.Code != 413 {
		t.Fatal("body bound", w.Code)
	}
	if w := httpCall(h, "GET", "/api/v1/search?q="+strings.Repeat("x", MaxSearchQuery), raw, ""); w.Code != 414 {
		t.Fatal("query bound", w.Code)
	}
	h.newID = func() (string, error) { return "", errors.New("synthetic-private-entropy-error") }
	if w := httpCall(h, "GET", "/api/v1/search?q=go", raw, ""); w.Code != 503 || strings.Contains(w.Body.String(), "synthetic-private") {
		t.Fatal("entropy refusal", w.Code, w.Body)
	}
	if store.reserveCalls != 0 || len(store.events) != 0 || store.createCalls != 1 {
		t.Fatal("rejected input performed data work")
	}
}

func TestHTTPServerIDsAndQuotaDenyExtraProviderWork(t *testing.T) {
	var calls atomic.Int32
	h, _, store, raw := httpHarness(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		_, _ = io.WriteString(w, `{"total_count":0,"items":[]}`)
	}))
	seen := map[string]bool{}
	for range 3 {
		r := httptest.NewRequest("GET", "/api/v1/search?q=go", nil)
		r.Header.Set("Authorization", "Bearer "+raw)
		r.Header.Set("X-Request-Id", "client-fixed-id")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		id := w.Header().Get("X-Request-Id")
		if w.Code != 200 || id == "client-fixed-id" || !identifier(id) || seen[id] {
			t.Fatal("server identity", w.Code, id)
		}
		seen[id] = true
	}
	w := httpCall(h, "GET", "/api/v1/search?q=go", raw, "")
	if w.Code != 429 || calls.Load() != 3 || len(store.events) != 3 {
		t.Fatal("quota spent provider work", w.Code, calls.Load(), len(store.events))
	}
	for _, event := range store.events {
		if event.completion == nil || event.completion.Status != 200 {
			t.Fatal("completion missing")
		}
	}
}

func TestHTTPReplayedInternalIDDoesNotExecuteAgain(t *testing.T) {
	var calls atomic.Int32
	h, _, store, raw := httpHarness(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		_, _ = io.WriteString(w, `{"total_count":0,"items":[]}`)
	}))
	h.newID = func() (string, error) { return "server-collision", nil }
	first := httpCall(h, "GET", "/api/v1/search?q=go", raw, "")
	second := httpCall(h, "GET", "/api/v1/search?q=go", raw, "")
	if first.Code != 200 || second.Code != 503 || calls.Load() != 1 || len(store.events) != 1 {
		t.Fatal("replay", first.Code, second.Code, calls.Load())
	}
}

func TestHTTPStalledBodyIsBoundedBeforeSessionAndDuringDrain(t *testing.T) {
	h, _, _, _ := httpHarness(t, nil)
	h.options.Budget = 30 * time.Millisecond
	server := httptest.NewServer(h)
	defer server.Close()
	conn, err := net.DialTimeout("tcp", server.Listener.Addr().String(), time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(2 * time.Second)); err != nil {
		t.Fatal(err)
	}
	_, err = fmt.Fprintf(conn, "POST /api/v1/keys HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer session-a\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\n\r\n{")
	if err != nil {
		t.Fatal(err)
	}
	response, err := http.ReadResponse(bufio.NewReader(conn), nil)
	if err != nil {
		t.Fatal("stalled request did not return", err)
	}
	defer response.Body.Close()
	if response.StatusCode != 504 {
		t.Fatal("body deadline returned", response.StatusCode)
	}
}

func TestHTTPRecoveryAfterCancellationNeverLeaksSuccess(t *testing.T) {
	h, _, store, raw := httpHarness(t, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	h.search = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"total_count":0,"items":[]}`)
		cancel()
	})
	store.completeErr = errors.New("synthetic-private-accounting-error")
	recoveries := 0
	h.options.SaveRecovery = func(ctx context.Context, c Completion) error {
		recoveries++
		if ctx.Err() != nil || c.Outcome != "cancelled" {
			t.Error("cancelled recovery", ctx.Err(), c)
		}
		return nil
	}
	r := httptest.NewRequest("GET", "/api/v1/search?q=go", nil).WithContext(ctx)
	r.Header.Set("Authorization", "Bearer "+raw)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 503 || strings.Contains(w.Body.String(), "items") || recoveries != 1 || store.completeCalls != 1 {
		t.Fatal("cancelled accounting", w.Code, w.Body, recoveries)
	}
}

func TestHTTPRedirectsCannotReachAnotherUpstream(t *testing.T) {
	var destinationCalls atomic.Int32
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		destinationCalls.Add(1)
		_, _ = io.WriteString(w, `{"total_count":0,"items":[]}`)
	}))
	defer destination.Close()
	for _, status := range []int{301, 302, 303, 307, 308} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			h, _, _, raw := httpHarness(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, destination.URL, status) }))
			if w := httpCall(h, "GET", "/api/v1/search?q=go", raw, ""); w.Code != 500 {
				t.Fatal("redirect accepted", w.Code)
			}
		})
	}
	if destinationCalls.Load() != 0 {
		t.Fatal("redirect followed")
	}
}

func TestHTTPRejectsUnconfiguredOrUnsafeBoundary(t *testing.T) {
	s, _, _ := setup(t)
	open := func(context.Context, string) (string, Manager, error) { return "owner-a", s, nil }
	save := func(context.Context, Completion) error { return nil }
	for _, base := range []string{"https://user:password@example.com", "http://public.example.com", "https://api.github.com?token=bad", "https://api.github.com/#fragment", "https://api.github.com/unreviewed"} {
		if _, err := NewHTTP(open, s, HTTPOptions{GitHubURL: base, SaveRecovery: save}); err == nil {
			t.Fatal("unsafe URL", base)
		}
	}
	if _, err := NewHTTP(nil, s, HTTPOptions{SaveRecovery: save}); err == nil {
		t.Fatal("missing session factory")
	}
	if _, err := NewHTTP(open, s, HTTPOptions{}); err == nil {
		t.Fatal("missing recovery sink")
	}
	if _, err := NewHTTP(open, s, HTTPOptions{Budget: MaxHTTPBudget + time.Nanosecond, SaveRecovery: save}); err == nil {
		t.Fatal("unbounded deadline")
	}
}

type cancelOnComplete struct {
	*memoryStore
	cancel context.CancelFunc
}

type injectingTransport struct {
	base  http.RoundTripper
	calls atomic.Int32
}

func (t *injectingTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	t.calls.Add(1)
	clone := r.Clone(r.Context())
	clone.Header.Set("Authorization", "Bearer synthetic-private-transport-credential")
	return t.base.RoundTrip(clone)
}

func TestHTTPPublicSearchDoesNotInheritDefaultCredentialTransport(t *testing.T) {
	service, _, _ := setup(t)
	_, raw := issue(t, service, "owner-a")
	var leaked atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		leaked.Store(r.Header.Get("Authorization") != "")
		_, _ = io.WriteString(w, `{"total_count":0,"items":[]}`)
	}))
	defer server.Close()
	prior := http.DefaultTransport
	injector := &injectingTransport{base: prior}
	http.DefaultTransport = injector
	defer func() { http.DefaultTransport = prior }()
	h, err := NewHTTP(func(context.Context, string) (string, Manager, error) { return "", nil, ErrOwner }, service, HTTPOptions{GitHubURL: server.URL, SaveRecovery: func(context.Context, Completion) error { return nil }})
	if err != nil {
		t.Fatal(err)
	}
	w := httpCall(h, "GET", "/api/v1/search?q=go", raw, "")
	if w.Code != 200 || leaked.Load() || injector.calls.Load() != 0 {
		t.Fatal("inherited credential transport", w.Code, leaked.Load(), injector.calls.Load())
	}
}

func TestHTTPProviderPanicOrOversizedBufferNeverEscapes(t *testing.T) {
	for _, name := range []string{"panic", "oversized"} {
		t.Run(name, func(t *testing.T) {
			h, _, store, raw := httpHarness(t, nil)
			h.search = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if name == "panic" {
					_, _ = io.WriteString(w, `{"items":["synthetic-private-partial"]`)
					panic("synthetic-private-panic")
				}
				_, _ = io.WriteString(w, strings.Repeat("x", MaxSearchReply+1))
			})
			w := httpCall(h, "GET", "/api/v1/search?q=go", raw, "")
			if w.Code < 500 || strings.Contains(w.Body.String(), "synthetic-private") || strings.Contains(w.Body.String(), "items") {
				t.Fatal("provider data escaped", w.Code, w.Body)
			}
			if store.completeCalls != 1 || len(store.events) != 1 {
				t.Fatal("failed operation lost accounting")
			}
		})
	}
}

func (c cancelOnComplete) Complete(ctx context.Context, receipt Completion) error {
	err := c.memoryStore.Complete(ctx, receipt)
	c.cancel()
	return err
}

func TestHTTPCancellationDuringCompletionWithholdsBufferedSuccess(t *testing.T) {
	h, service, store, raw := httpHarness(t, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	service.accounting = cancelOnComplete{store, cancel}
	r := httptest.NewRequest("GET", "/api/v1/search?q=go", nil).WithContext(ctx)
	r.Header.Set("Authorization", "Bearer "+raw)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 408 || strings.Contains(w.Body.String(), "items") {
		t.Fatal("cancelled response escaped", w.Code, w.Body)
	}
	if store.completeCalls != 1 || len(store.events) != 1 {
		t.Fatal("accounting repeated")
	}
	for _, event := range store.events {
		if event.completion == nil || event.completion.Status != 200 || event.completion.Outcome != "success" {
			t.Fatal("observed provider result lost")
		}
	}
}
