package aichat

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/ailimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
)

// provider answers every call with status and body, and counts the calls.
func provider(calls *int, status int, body string) *aiprovider.Client {
	return &aiprovider.Client{HTTP: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
		*calls++
		return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}}
}

func signedIn(*http.Request) (string, int) { return "user-a", 200 }

func newHandler(models *aiprovider.Client, log io.Writer) *Handler {
	return &Handler{SignIn: signedIn, Models: models, Limiter: ailimit.New(ailimit.Requests, ailimit.Window), Logger: slog.New(slog.NewTextHandler(log, nil))}
}

func post(h http.Handler, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("POST", "/api/ai/chat", strings.NewReader(body)))
	return rec
}

// The body may be as large as the limit and no larger. Past it the caller
// gets the fixed sentence and no provider is called.
func TestRequestBodyLimit(t *testing.T) {
	// The browser sends the whole conversation each time, so a long chat is
	// a large body. The ADR records 4 MiB, below Vercel's 4.5 MB.
	if maxRequestBytes != 4<<20 {
		t.Errorf("maxRequestBytes is %d; the recorded limit is 4 MiB", maxRequestBytes)
	}
	message := `{"messages":[{"role":"user","content":"hi"}]}`
	padded := message + strings.Repeat(" ", maxRequestBytes-len(message))

	calls := 0
	rec := post(newHandler(provider(&calls, 200, `{"choices":[{"message":{"content":"Hello!"}}]}`), io.Discard), padded)
	if rec.Code != 200 || calls != 1 {
		t.Errorf("a body of exactly %d bytes: %d %s after %d calls", maxRequestBytes, rec.Code, rec.Body, calls)
	}

	calls = 0
	var log bytes.Buffer
	rec = post(newHandler(provider(&calls, 200, `{"choices":[{"message":{"content":"Hello!"}}]}`), &log), padded+" ")
	if rec.Code != 500 || strings.TrimSpace(rec.Body.String()) != `{"error":"Failed to generate AI response"}` || calls != 0 {
		t.Errorf("one byte over: %d %s after %d calls", rec.Code, rec.Body, calls)
	}
	if !strings.Contains(log.String(), "stage=read_body") {
		t.Errorf("log: %s", log.String())
	}
}

// The body is read as request.json() reads it in Next.js: a leading
// byte-order mark is dropped, and a broken UTF-8 sequence becomes one U+FFFD.
// Node 21 gave exactly this content for the same bytes. The fixtures cannot
// carry it: their runner writes each body with JSON.stringify.
func TestBodyIsDecodedAsRequestJSONDecodesIt(t *testing.T) {
	var sent []byte
	models := &aiprovider.Client{HTTP: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		sent, _ = io.ReadAll(r.Body)
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"choices":[{"message":{"content":"Hello!"}}]}`))}, nil
	})}}
	body := "\xef\xbb\xbf" + `{"messages":[{"role":"user","content":"a` + "\xe3\x80\x41" + `"}]}`
	rec := post(newHandler(models, io.Discard), body)
	if rec.Code != 200 {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	want := `{"role":"user","content":"a` + string(rune(0xFFFD)) + `A"}`
	if !strings.Contains(string(sent), want) {
		t.Errorf("forwarded %s\nwant it to contain %s", sent, want)
	}
}

// One record per failure, with its stage. What the user wrote is not in it,
// and neither is what the provider said.
func TestFailuresAreLoggedWithoutTheConversation(t *testing.T) {
	calls := 0
	var log bytes.Buffer
	rec := post(newHandler(provider(&calls, 429, `you said: my private plan`), &log), `{"messages":[{"role":"user","content":"my private plan"}]}`)
	logged := log.String()
	if rec.Code != 500 || strings.Count(logged, "level=ERROR") != 1 || !strings.Contains(logged, "stage=ai_call") || !strings.Contains(logged, "429") || strings.Contains(logged, "private") {
		t.Errorf("status %d, log:\n%s", rec.Code, logged)
	}

	// A title falls back instead of failing, and says why in the log.
	log.Reset()
	rec = post(newHandler(provider(&calls, 500, ``), &log), `{"messages":[{"role":"user","content":"my private plan"}],"action":"generate_title"}`)
	logged = log.String()
	if rec.Code != 200 || strings.Count(logged, "level=ERROR") != 1 || !strings.Contains(logged, "stage=title_call") || strings.Contains(logged, "private") {
		t.Errorf("title: status %d, log:\n%s", rec.Code, logged)
	}
	log.Reset()
	post(newHandler(provider(&calls, 200, `{"choices":[{"message":{"content":42}}]}`), &log), `{"messages":[{"role":"user","content":"my private plan"}],"action":"generate_title"}`)
	if logged = log.String(); !strings.Contains(logged, "stage=title_reply") || strings.Contains(logged, "private") {
		t.Errorf("title that is not text, log:\n%s", logged)
	}
}

// Any answer from the sign-in check other than 200 or 401 is reported as
// an outage with that status, as the Next.js handler does.
func TestOtherSignInAnswers(t *testing.T) {
	calls := 0
	h := newHandler(provider(&calls, 200, `{}`), io.Discard)
	h.SignIn = func(*http.Request) (string, int) { return "", 503 }
	rec := post(h, `{"messages":[{"role":"user","content":"hi"}]}`)
	if rec.Code != 503 || strings.TrimSpace(rec.Body.String()) != `{"error":"Sign-in could not be verified"}` || calls != 0 {
		t.Errorf("503: %d %s after %d calls", rec.Code, rec.Body, calls)
	}
}

// The allowance is counted per user, whatever address a request comes from.
func TestAllowanceFollowsTheUserNotTheAddress(t *testing.T) {
	calls := 0
	h := newHandler(provider(&calls, 200, `{"choices":[{"message":{"content":"Hello!"}}]}`), io.Discard)
	for i := 0; i < ailimit.Requests; i++ {
		req := httptest.NewRequest("POST", "/api/ai/chat", strings.NewReader(`{"messages":[{"role":"user","content":"hi"}]}`))
		req.Header.Set("X-Forwarded-For", "203.0.113."+string(rune('0'+i%10)))
		h.ServeHTTP(httptest.NewRecorder(), req)
	}
	if rec := post(h, `{"messages":[{"role":"user","content":"hi"}]}`); rec.Code != 429 || rec.Header().Get("Retry-After") == "" {
		t.Errorf("request %d from the same user: %d", ailimit.Requests+1, rec.Code)
	}
	if calls != ailimit.Requests {
		t.Errorf("%d provider calls, want %d", calls, ailimit.Requests)
	}
}
