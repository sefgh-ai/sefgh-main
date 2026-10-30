package sharetoken

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
	"testing"
)

var discard = slog.New(slog.NewTextHandler(io.Discard, nil))

// Stand-ins: none of these addresses reaches a network. They are the ones
// scripts/contracts/share-fixture.mjs recorded with.
const (
	fixtureSupabaseURL = "https://contract-supabase.invalid"
	fixtureSupabaseKey = "public-fixture-key"
)

type databaseCall struct {
	Path          string  `json:"path"`
	Accept        *string `json:"accept"`
	Authorization *string `json:"authorization"`
	APIKey        *string `json:"apikey"`
}

type fixture struct {
	ID           string  `json:"id"`
	Token        string  `json:"token"`
	Session      *string `json:"session"`
	ClientThrows bool    `json:"client_throws"`
	Database     struct {
		Status       int             `json:"status"`
		Body         json.RawMessage `json:"body"`
		Raw          *string         `json:"raw"`
		NetworkError bool            `json:"network_error"`
	} `json:"database"`
	Expect struct {
		Status      int             `json:"status"`
		Body        json.RawMessage `json:"body"`
		ContentType string          `json:"content_type"`
		Cache       *string         `json:"cache_control"`
		Database    []databaseCall  `json:"database"`
	} `json:"expect"`
}

func loadContract(t *testing.T) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/share-token/cases.json")
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

// standIn answers the Data API for one fixture and records what it was
// asked.
type standIn struct {
	t     *testing.T
	f     fixture
	calls []databaseCall
}

func (s *standIn) RoundTrip(r *http.Request) (*http.Response, error) {
	header := func(name string) *string {
		if value := r.Header.Get(name); value != "" {
			return &value
		}
		return nil
	}
	if !strings.HasPrefix(r.URL.String(), fixtureSupabaseURL+"/") {
		s.t.Errorf("%s: a request outside the Data API: %s", s.f.ID, r.URL)
	}
	s.calls = append(s.calls, databaseCall{Path: r.URL.RequestURI(), Accept: header("Accept"), Authorization: header("Authorization"), APIKey: header("apikey")})
	answer := s.f.Database
	if answer.NetworkError {
		return nil, errors.New("fetch failed")
	}
	body := string(answer.Body)
	if answer.Raw != nil {
		body = *answer.Raw
	}
	status := answer.Status
	if status == 0 {
		status = 200
	}
	return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
}

// serve runs one fixture through the handler, routed as cmd/api routes it,
// so the token arrives through the path.
func serve(t *testing.T, f fixture) (*httptest.ResponseRecorder, *standIn) {
	t.Helper()
	stand := &standIn{t: t, f: f}
	h := &Handler{Database: &http.Client{Transport: stand}, SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Logger: discard}
	if f.ClientThrows {
		h.SupabaseURL, h.SupabaseKey = "", ""
	}
	mux := http.NewServeMux()
	mux.Handle("GET /api/share/{token}", h)
	r := httptest.NewRequest(http.MethodGet, "/api/share/"+url.PathEscape(f.Token), nil)
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
			var body, want any
			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatalf("reply is not JSON: %s", w.Body)
			}
			_ = json.Unmarshal(f.Expect.Body, &want)
			if !reflect.DeepEqual(body, want) {
				t.Errorf("body\n got  %.900s\n want %.900s", w.Body.String(), f.Expect.Body)
			}
			// The database is asked exactly as supabase-js asked it: the same
			// path and query, byte for byte, and the same three headers.
			calls := stand.calls
			if calls == nil {
				calls = []databaseCall{}
			}
			if !reflect.DeepEqual(calls, f.Expect.Database) {
				gotJSON, _ := json.Marshal(calls)
				wantJSON, _ := json.Marshal(f.Expect.Database)
				t.Errorf("database\n got  %s\n want %s", gotJSON, wantJSON)
			}
		})
	}
}
