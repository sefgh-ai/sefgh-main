package onboarding

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

const (
	fixtureSupabaseURL = "https://contract-supabase.invalid"
	fixtureSupabaseKey = "public-fixture-key"
	fixtureUser        = "0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b"
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
	Accept        *string         `json:"accept"`
	ContentType   *string         `json:"content_type"`
	Authorization *string         `json:"authorization"`
	APIKey        *string         `json:"apikey"`
	Body          json.RawMessage `json:"body"`
}

type goRequest struct {
	Method        string          `json:"method"`
	Path          string          `json:"path"`
	Authorization *string         `json:"authorization"`
	Body          json.RawMessage `json:"body"`
}

type fixture struct {
	ID         string          `json:"id"`
	Database   []answer        `json:"database"`
	GoDatabase *[]databaseCall `json:"go_database"`
	GoStatus   int             `json:"go_status"`
	Expect     struct {
		Database   []databaseCall    `json:"database"`
		GoRequests []goRequest       `json:"go_requests"`
		GoAnswers  []json.RawMessage `json:"go_answers"`
	} `json:"expect"`
}

func loadContract(t *testing.T) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/onboarding/cases.json")
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

// standIn answers Supabase Auth (session-a is the fixture's user) and the
// Data API from the fixture's replies in order, recording each Data API
// request.
type standIn struct {
	t     *testing.T
	f     fixture
	calls []databaseCall
}

func (s *standIn) RoundTrip(r *http.Request) (*http.Response, error) {
	reply := func(status int, body string) (*http.Response, error) {
		return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	}
	if r.Header.Get("apikey") != fixtureSupabaseKey {
		s.t.Errorf("%s: a request without the public key: %s", s.f.ID, r.URL)
	}
	if r.URL.Path == "/auth/v1/user" {
		if r.Header.Get("Authorization") != "Bearer session-a" {
			return reply(401, `{"msg":"invalid JWT"}`)
		}
		return reply(200, `{"id":"`+fixtureUser+`"}`)
	}
	header := func(name string) *string {
		if v := r.Header.Get(name); v != "" {
			return &v
		}
		return nil
	}
	call := databaseCall{Method: r.Method, Path: r.URL.RequestURI(), Prefer: header("Prefer"), Accept: header("Accept"), ContentType: header("Content-Type"), Authorization: header("Authorization"), APIKey: header("apikey"), Body: json.RawMessage("null")}
	if r.Body != nil {
		if body, _ := io.ReadAll(r.Body); len(body) > 0 {
			call.Body = body
		}
	}
	s.calls = append(s.calls, call)
	next := answer{Status: 200, Body: json.RawMessage(`[]`)}
	if n := len(s.calls); n <= len(s.f.Database) {
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
	return reply(status, body)
}

// Each Go request the switched module sent must be answered with the result
// postgrest-js gave the browser for the same reply, making the same Data API
// requests as the browser did (or those in go_database).
func TestContract(t *testing.T) {
	for _, f := range loadContract(t) {
		t.Run(f.ID, func(t *testing.T) {
			stand := &standIn{t: t, f: f}
			client := &http.Client{Transport: stand}
			verifier := githubaccess.Verifier{SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Client: client}
			h := &Handler{User: verifier.User, Database: client, SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Logger: discard}
			mux := http.NewServeMux()
			h.Register(mux)
			wantStatus := f.GoStatus
			if wantStatus == 0 {
				wantStatus = 200
			}
			for i, g := range f.Expect.GoRequests {
				var body io.Reader
				if len(g.Body) > 0 && string(g.Body) != "null" {
					body = strings.NewReader(string(g.Body))
				}
				r := httptest.NewRequest(g.Method, g.Path, body)
				if g.Authorization != nil {
					r.Header.Set("Authorization", *g.Authorization)
				}
				w := httptest.NewRecorder()
				mux.ServeHTTP(w, r)
				if w.Code != wantStatus {
					t.Fatalf("request %d: status %d, contract %d: %s", i, w.Code, wantStatus, w.Body)
				}
				if !sameJSON(w.Body.Bytes(), f.Expect.GoAnswers[i]) {
					t.Errorf("request %d answer\n got  %s\n want %s", i, w.Body, f.Expect.GoAnswers[i])
				}
			}
			want := f.Expect.Database
			if f.GoDatabase != nil {
				want = *f.GoDatabase
			}
			checkDatabase(t, stand.calls, want)
		})
	}
}

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
