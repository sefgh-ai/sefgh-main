package shares

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

var discard = slog.New(slog.NewTextHandler(io.Discard, nil))

// Stand-ins: none of these addresses reaches a network. They and the clock
// are the ones scripts/contracts/route-db-fixture.mjs recorded with.
const (
	fixtureSupabaseURL = "https://contract-supabase.invalid"
	fixtureSupabaseKey = "public-fixture-key"
)

var fixtureNow = time.Date(2026, 10, 17, 9, 30, 0, 0, time.UTC)

type answer struct {
	Status       int               `json:"status"`
	Body         json.RawMessage   `json:"body"`
	Raw          *string           `json:"raw"`
	Headers      map[string]string `json:"headers"`
	NetworkError bool              `json:"network_error"`
}

type databaseCall struct {
	Method        string          `json:"method"`
	Path          string          `json:"path"`
	Prefer        *string         `json:"prefer"`
	Accept        *string         `json:"accept"`
	ContentType   *string         `json:"content_type"`
	Authorization *string         `json:"authorization"`
	APIKey        *string         `json:"apikey"`
	Body          json.RawMessage `json:"body"`
}

type fixture struct {
	ID            string            `json:"id"`
	Method        string            `json:"method"`
	Params        map[string]string `json:"params"`
	Body          string            `json:"body"`
	Session       *string           `json:"session"`
	User          json.RawMessage   `json:"user"`
	SiteURL       *string           `json:"site_url"`
	ClientThrows  bool              `json:"client_throws"`
	EngineMessage bool              `json:"engine_message"`
	Database      []answer          `json:"database"`
	Expect        struct {
		Status      int             `json:"status"`
		Body        json.RawMessage `json:"body"`
		ContentType string          `json:"content_type"`
		Cache       *string         `json:"cache_control"`
		Database    []databaseCall  `json:"database"`
	} `json:"expect"`
}

func loadContract(t *testing.T, name string) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/" + name + "/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Version int       `json:"contract_version"`
		Cases   []fixture `json:"cases"`
	}
	if err = json.Unmarshal(raw, &contract); err != nil {
		t.Fatal(err)
	}
	if contract.Version != 1 || len(contract.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases", contract.Version, len(contract.Cases))
	}
	return contract.Cases
}

// standIn answers Supabase Auth and the Data API for one fixture, and
// records each request but the sign-in check.
type standIn struct {
	t     *testing.T
	f     fixture
	mu    sync.Mutex
	calls []databaseCall
}

func (s *standIn) RoundTrip(r *http.Request) (*http.Response, error) {
	reply := func(status int, body string, headers map[string]string) (*http.Response, error) {
		header := http.Header{"Content-Type": {"application/json"}}
		for name, value := range headers {
			header.Set(name, value)
		}
		return &http.Response{StatusCode: status, Header: header, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	}
	if !strings.HasPrefix(r.URL.String(), fixtureSupabaseURL+"/") || r.Header.Get("apikey") != fixtureSupabaseKey {
		s.t.Errorf("%s: a request outside Supabase or without the public key: %s", s.f.ID, r.URL)
	}
	if r.URL.Path == "/auth/v1/user" {
		accepted := s.f.Session != nil && r.Header.Get("Authorization") == "Bearer "+*s.f.Session
		if !accepted || !strings.HasPrefix(string(s.f.User), "{") || strings.Contains(string(s.f.User), `"error"`) {
			return reply(401, `{"msg":"invalid JWT"}`, nil)
		}
		return reply(200, string(s.f.User), nil)
	}
	header := func(name string) *string {
		if value := r.Header.Get(name); value != "" {
			return &value
		}
		return nil
	}
	call := databaseCall{Method: r.Method, Path: r.URL.RequestURI(), Prefer: header("Prefer"), Accept: header("Accept"), ContentType: header("Content-Type"), Authorization: header("Authorization"), APIKey: header("apikey"), Body: json.RawMessage("null")}
	if r.Body != nil {
		if body, _ := io.ReadAll(r.Body); len(body) > 0 {
			call.Body = body
		}
	}
	s.mu.Lock()
	s.calls = append(s.calls, call)
	n := len(s.calls)
	s.mu.Unlock()

	next := answer{Status: 200, Body: json.RawMessage(`[]`)}
	if n <= len(s.f.Database) {
		next = s.f.Database[n-1]
	}
	if next.NetworkError {
		return nil, errors.New("fetch failed")
	}
	body := string(next.Body)
	if next.Raw != nil {
		body = *next.Raw
	}
	status := next.Status
	if status == 0 {
		status = 200
	}
	return reply(status, body, next.Headers)
}

// serve runs one fixture through the real verifier and handler, routed as
// cmd/api routes it, with each path parameter percent-encoded in the path.
func serve(t *testing.T, contract string, f fixture) (*httptest.ResponseRecorder, *standIn) {
	t.Helper()
	stand := &standIn{t: t, f: f}
	client := &http.Client{Transport: stand}
	verifier := githubaccess.Verifier{SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Client: client}
	supabaseURL, supabaseKey := fixtureSupabaseURL, fixtureSupabaseKey
	if f.ClientThrows {
		supabaseURL, supabaseKey = "", ""
	}
	mux := http.NewServeMux()
	var target string
	if contract == "conversation-share" {
		h := &Conversation{User: verifier.User, Database: client, SupabaseURL: supabaseURL, SupabaseKey: supabaseKey,
			Now: func() time.Time { return fixtureNow }, Logger: discard}
		if f.SiteURL != nil {
			h.SiteURL = *f.SiteURL
		}
		mux.Handle("POST /api/conversations/{id}/share", h)
		mux.Handle("DELETE /api/conversations/{id}/share", h)
		target = "/api/conversations/" + url.PathEscape(f.Params["id"]) + "/share"
	} else {
		mux.Handle("POST /api/share/{token}/fork", &Fork{User: verifier.User, Database: client, SupabaseURL: supabaseURL, SupabaseKey: supabaseKey, Logger: discard})
		target = "/api/share/" + url.PathEscape(f.Params["token"]) + "/fork"
	}
	var body io.Reader
	if f.Method == "POST" {
		body = strings.NewReader(f.Body)
	}
	r := httptest.NewRequest(f.Method, target, body)
	// Without NEXT_PUBLIC_SITE_URL the link starts with the origin the
	// browser used, https://app.test in the recording, which a proxy in
	// front of this server forwards in these two headers.
	r.Header.Set("X-Forwarded-Host", "app.test")
	r.Header.Set("X-Forwarded-Proto", "https")
	if f.Session != nil {
		r.Header.Set("Authorization", "Bearer "+*f.Session)
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	return w, stand
}

func TestConversationShareContract(t *testing.T) { runContract(t, "conversation-share") }
func TestShareForkContract(t *testing.T)         { runContract(t, "share-fork") }

func runContract(t *testing.T, contract string) {
	for _, f := range loadContract(t, contract) {
		t.Run(f.ID, func(t *testing.T) {
			w, stand := serve(t, contract, f)
			if w.Code != f.Expect.Status {
				t.Errorf("status %d, contract %d", w.Code, f.Expect.Status)
			}
			if got := w.Header().Get("Content-Type"); got != f.Expect.ContentType {
				t.Errorf("content type %q, contract %q", got, f.Expect.ContentType)
			}
			got, set := w.Header()["Cache-Control"]
			if (f.Expect.Cache == nil) == set || (set && got[0] != *f.Expect.Cache) {
				t.Errorf("cache control %q, contract %v", got, f.Expect.Cache)
			}
			if f.EngineMessage {
				// The text comes from the JavaScript engine; only its being
				// one non-empty message is pinned.
				var body map[string]any
				text, isText := "", false
				if json.Unmarshal(w.Body.Bytes(), &body) == nil && len(body) == 1 {
					text, isText = body["error"].(string)
				}
				if !isText || text == "" {
					t.Errorf("body %s, want {\"error\": text}", w.Body)
				}
			} else if !sameJSON(w.Body.Bytes(), f.Expect.Body) {
				t.Errorf("body\n got  %.1200s\n want %.1200s", w.Body.String(), f.Expect.Body)
			}
			checkDatabase(t, stand.calls, f.Expect.Database)
		})
	}
}

// checkDatabase compares every request: method, path and query byte for
// byte, the headers, and the body as JSON.
func checkDatabase(t *testing.T, got, want []databaseCall) {
	t.Helper()
	if len(got) != len(want) {
		gotJSON, _ := json.Marshal(got)
		t.Fatalf("%d requests, contract %d: %s", len(got), len(want), gotJSON)
	}
	for i := range want {
		g, w := got[i], want[i]
		if !sameJSON(g.Body, w.Body) {
			t.Errorf("request %d body\n got  %s\n want %s", i, g.Body, w.Body)
		}
		g.Body, w.Body = nil, nil
		if !reflect.DeepEqual(g, w) {
			gotJSON, _ := json.Marshal(g)
			wantJSON, _ := json.Marshal(w)
			t.Errorf("request %d\n got  %s\n want %s", i, gotJSON, wantJSON)
		}
	}
}

func sameJSON(a, b []byte) bool {
	var x, y any
	if json.Unmarshal(a, &x) != nil || json.Unmarshal(b, &y) != nil {
		return false
	}
	return reflect.DeepEqual(x, y)
}
