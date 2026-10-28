package collect

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

var discard = slog.New(slog.NewTextHandler(io.Discard, nil))

// Stand-ins: none of these addresses reaches a network. They are the ones
// scripts/contracts/collect-fixture.mjs recorded with.
const (
	fixtureSupabaseURL = "https://contract-supabase.invalid"
	fixtureSupabaseKey = "public-fixture-key"
)

type answer struct {
	Status       int             `json:"status"`
	Body         json.RawMessage `json:"body"`
	Raw          *string         `json:"raw"`
	NetworkError bool            `json:"network_error"`
}

type databaseCall struct {
	Method        string          `json:"method"`
	Path          string          `json:"path"`
	Prefer        *string         `json:"prefer"`
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
	raw, err := os.ReadFile("../../../contracts/repo-collect/cases.json")
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
	if contract.Version != 2 || len(contract.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases", contract.Version, len(contract.Cases))
	}
	return contract.Cases
}

// standIn answers Supabase Auth and the Data API for one fixture, and
// records each Data API request.
type standIn struct {
	t     *testing.T
	f     fixture
	calls []databaseCall
}

func (s *standIn) RoundTrip(r *http.Request) (*http.Response, error) {
	reply := func(status int, body string) (*http.Response, error) {
		return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	}
	if !strings.HasPrefix(r.URL.String(), fixtureSupabaseURL+"/") {
		s.t.Errorf("%s: a request outside Supabase: %s", s.f.ID, r.URL)
	}
	if r.Header.Get("apikey") != fixtureSupabaseKey {
		s.t.Errorf("%s: a Supabase request without the public key: %s", s.f.ID, r.URL)
	}
	if r.URL.Path == "/auth/v1/user" {
		// Auth answers the fixture's user for the fixture's own session.
		accepted := s.f.Session != nil && r.Header.Get("Authorization") == "Bearer "+*s.f.Session
		if !accepted || !strings.HasPrefix(string(s.f.User), "{") || strings.Contains(string(s.f.User), `"error"`) {
			return reply(401, `{"msg":"invalid JWT"}`)
		}
		return reply(200, string(s.f.User))
	}
	header := func(name string) *string {
		if value := r.Header.Get(name); value != "" {
			return &value
		}
		return nil
	}
	call := databaseCall{Method: r.Method, Path: r.URL.RequestURI(), Prefer: header("Prefer"), ContentType: header("Content-Type"), Authorization: header("Authorization"), APIKey: header("apikey"), Body: json.RawMessage("null")}
	if r.Body != nil {
		if body, _ := io.ReadAll(r.Body); len(body) > 0 {
			call.Body = body
		}
	}
	s.calls = append(s.calls, call)
	next := answer{Status: 200, Body: json.RawMessage(`[]`)}
	if len(s.calls) <= len(s.f.Database) {
		next = s.f.Database[len(s.calls)-1]
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
	return reply(status, body)
}

// serve runs one fixture through the real verifier and handler, routed as
// cmd/api routes it.
func serve(t *testing.T, f fixture) (*httptest.ResponseRecorder, *standIn) {
	t.Helper()
	stand := &standIn{t: t, f: f}
	client := &http.Client{Transport: stand}
	verifier := githubaccess.Verifier{SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Client: client}
	h := &Handler{User: verifier.User, Database: client, SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Logger: discard}
	if f.ClientThrows {
		h.SupabaseURL, h.SupabaseKey = "", ""
	}
	mux := http.NewServeMux()
	for _, method := range []string{"GET", "POST", "DELETE"} {
		mux.Handle(method+" /api/repo/collect", h)
	}
	target := "/api/repo/collect"
	if f.Query != "" {
		target += "?" + f.Query
	}
	var body io.Reader
	if f.Method == "POST" {
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
				t.Errorf("body\n got  %.900s\n want %.900s", w.Body.String(), f.Expect.Body)
			}
			checkDatabase(t, stand.calls, f.Expect.Database)
		})
	}
}

// checkDatabase compares every Data API request: method, path and query
// byte for byte, the headers, and the body as JSON.
func checkDatabase(t *testing.T, got, want []databaseCall) {
	t.Helper()
	if len(got) != len(want) {
		gotJSON, _ := json.Marshal(got)
		t.Fatalf("%d database requests, contract %d: %s", len(got), len(want), gotJSON)
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
