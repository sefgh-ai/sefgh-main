package comments

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"sort"
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
	Match        string            `json:"match"`
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
	ID           string          `json:"id"`
	Method       string          `json:"method"`
	Query        string          `json:"query"`
	Body         string          `json:"body"`
	Session      *string         `json:"session"`
	User         json.RawMessage `json:"user"`
	ClientThrows bool            `json:"client_throws"`
	Database     []answer        `json:"database"`
	Routes       []answer        `json:"routes"`
	Expect       struct {
		Status      int             `json:"status"`
		Body        json.RawMessage `json:"body"`
		ContentType string          `json:"content_type"`
		Cache       *string         `json:"cache_control"`
		Database    []databaseCall  `json:"database"`
	} `json:"expect"`
}

func loadContract(t *testing.T) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/repo-comments/cases.json")
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
	if contract.Version != 3 || len(contract.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases", contract.Version, len(contract.Cases))
	}
	return contract.Cases
}

// standIn answers Supabase Auth, its admin API and the Data API for one
// fixture, and records each request but the sign-in check. GET's details
// run at the same time, so it is safe for concurrent use.
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
		if r.Method == http.MethodHead {
			body = ""
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
	if s.f.Routes != nil {
		asked := r.Method + " " + r.URL.RequestURI()
		for _, route := range s.f.Routes {
			if strings.Contains(asked, route.Match) {
				next = route
				break
			}
		}
	} else if n <= len(s.f.Database) {
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
// cmd/api routes it.
func serve(t *testing.T, f fixture) (*httptest.ResponseRecorder, *standIn) {
	t.Helper()
	stand := &standIn{t: t, f: f}
	client := &http.Client{Transport: stand}
	verifier := githubaccess.Verifier{SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Client: client}
	h := &Handler{User: verifier.UserEmail, Database: client, SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey,
		Now: func() time.Time { return fixtureNow }, Logger: discard}
	if f.ClientThrows {
		h.SupabaseURL, h.SupabaseKey = "", ""
	}
	mux := http.NewServeMux()
	for _, method := range []string{"GET", "POST", "PATCH", "DELETE"} {
		mux.Handle(method+" /api/repo/comments", h)
	}
	target := "/api/repo/comments"
	if f.Query != "" {
		target += "?" + f.Query
	}
	var body io.Reader
	if f.Method == "POST" || f.Method == "PATCH" {
		body = strings.NewReader(f.Body)
	}
	r := httptest.NewRequest(f.Method, target, body)
	if f.Session != nil {
		r.Header.Set("Authorization", "Bearer "+*f.Session)
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	return w, stand
}

func TestContract(t *testing.T) {
	for _, f := range loadContract(t) {
		t.Run(f.ID, func(t *testing.T) {
			w, stand := serve(t, f)
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
			if !sameJSON(w.Body.Bytes(), f.Expect.Body) {
				t.Errorf("body\n got  %.1200s\n want %.1200s", w.Body.String(), f.Expect.Body)
			}
			calls, want := stand.calls, f.Expect.Database
			if f.Routes != nil {
				// GET's details run at the same time in both backends, so
				// their order is not part of the contract.
				calls, want = sorted(calls), sorted(want)
			}
			checkDatabase(t, calls, want)
		})
	}
}

func sorted(calls []databaseCall) []databaseCall {
	out := append([]databaseCall(nil), calls...)
	sort.SliceStable(out, func(i, j int) bool { return out[i].Method+" "+out[i].Path < out[j].Method+" "+out[j].Path })
	return out
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
