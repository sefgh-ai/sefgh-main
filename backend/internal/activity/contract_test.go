package activity

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"
	_ "time/tzdata" // the fixtures name time zones; this works on any machine

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

// Stand-ins for the project's settings and the two sessions a fixture can
// stand for. None of them reaches a network.
const (
	fixtureSupabaseURL = "https://contract-supabase.invalid"
	fixtureSupabaseKey = "public-fixture-key"
	acceptedSession    = "session-accepted"
	refusedSession     = "session-refused"
)

type fixture struct {
	ID           string          `json:"id"`
	Now          string          `json:"now"`
	Timezone     string          `json:"timezone"`
	User         json.RawMessage `json:"user"`
	ClientThrows bool            `json:"client_throws"`
	Rows         json.RawMessage `json:"rows"`
	QueryError   string          `json:"query_error"`
	Expect       struct {
		Status      int             `json:"status"`
		Body        json.RawMessage `json:"body"`
		ContentType string          `json:"content_type"`
		Cache       *string         `json:"cache_control"`
		Query       [][]any         `json:"query"`
	} `json:"expect"`
}

func loadContract(t *testing.T) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/activity/cases.json")
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
// records what the Data API was asked.
type standIn struct {
	t        *testing.T
	f        fixture
	mu       sync.Mutex
	database []*http.Request
}

func (s *standIn) RoundTrip(r *http.Request) (*http.Response, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	answer := func(status int, body string) (*http.Response, error) {
		return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(body))}, nil
	}
	if r.Header.Get("apikey") != fixtureSupabaseKey {
		s.t.Errorf("%s: a request to %s without the public key", s.f.ID, r.URL.Path)
		return answer(401, `{}`)
	}
	switch r.URL.Path {
	case "/auth/v1/user":
		// A fixture user marked "unreachable" is Supabase Auth failing (R-063).
		if strings.Contains(string(s.f.User), `"unreachable"`) {
			return answer(503, `{"message":"upstream unavailable"}`)
		}
		if r.Header.Get("Authorization") != "Bearer "+acceptedSession {
			return answer(401, `{"msg":"invalid JWT"}`)
		}
		return answer(200, string(s.f.User))
	case "/rest/v1/activity_logs":
		s.database = append(s.database, r)
		// The database is asked as the user: their own token, never a
		// server credential.
		if got := r.Header.Get("Authorization"); got != "Bearer "+acceptedSession {
			s.t.Errorf("%s: the database was asked with %q, not the user's token", s.f.ID, got)
		}
		if s.f.QueryError != "" {
			body, _ := json.Marshal(map[string]string{"code": "42501", "message": s.f.QueryError})
			return answer(403, string(body))
		}
		rows := string(s.f.Rows)
		if rows == "" {
			rows = "[]"
		}
		return answer(200, rows)
	}
	s.t.Errorf("%s: unexpected request to %s", s.f.ID, r.URL)
	return answer(404, `{}`)
}

// serve runs one fixture through the real verifier and handler.
func serve(t *testing.T, f fixture) (*httptest.ResponseRecorder, *standIn) {
	t.Helper()
	stand := &standIn{t: t, f: f}
	client := &http.Client{Transport: stand}
	verifier := githubaccess.Verifier{SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Client: client}
	now, err := time.Parse(time.RFC3339, f.Now)
	if err != nil {
		t.Fatal(err)
	}
	// The server's own time zone, which must make no difference (R-057).
	zone, err := time.LoadLocation(f.Timezone)
	if err != nil {
		t.Fatal(err)
	}
	h := &Handler{
		User: verifier.User, Client: client,
		SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey,
		Now:    func() time.Time { return now.In(zone) },
		Logger: discard,
	}
	// A client that cannot be built is, for Go, a server without settings.
	if f.ClientThrows {
		h.SupabaseURL, h.SupabaseKey = "", ""
	}
	r := httptest.NewRequest(http.MethodGet, "/api/activity", nil)
	switch {
	case string(f.User) == "null" || len(f.User) == 0:
		// Signed out: no bearer at all.
	case strings.Contains(string(f.User), `"unreachable"`):
		r.Header.Set("Authorization", "Bearer "+acceptedSession)
	case strings.Contains(string(f.User), `"error"`):
		r.Header.Set("Authorization", "Bearer "+refusedSession)
	default:
		r.Header.Set("Authorization", "Bearer "+acceptedSession)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w, stand
}

func TestContract(t *testing.T) {
	for _, f := range loadContract(t) {
		t.Run(f.ID, func(t *testing.T) { check(t, f) })
	}
}

// check runs one fixture and compares the answer with its expect.
func check(t *testing.T, f fixture) {
	t.Helper()
	w, stand := serve(t, f)
	if w.Code != f.Expect.Status {
		t.Errorf("status %d, expected %d", w.Code, f.Expect.Status)
	}
	if got := w.Header().Get("Content-Type"); got != f.Expect.ContentType {
		t.Errorf("content type %q, expected %q", got, f.Expect.ContentType)
	}
	if got, set := w.Header()["Cache-Control"]; (f.Expect.Cache == nil) == set {
		t.Errorf("cache control %q, expected %v", got, f.Expect.Cache)
	}
	got, want := compact(t, w.Body.Bytes()), plain(t, f.Expect.Body)
	if !reflect.DeepEqual(got, want) {
		t.Errorf("body differs: %s", firstDifference(got, want))
	}
	checkQuery(t, stand.database, f.Expect.Query)
}

// compact decodes a reply and writes each day of its grid as
// [date, count, color, weekIndex, dayOfWeekIndex], as the Node runner does.
func compact(t *testing.T, raw []byte) any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatalf("reply is not a JSON object: %s", raw)
	}
	if weeks, isList := body["grid"].([]any); isList {
		for i, week := range weeks {
			days := week.([]any)
			for j, d := range days {
				day := d.(map[string]any)
				days[j] = []any{day["date"], day["count"], day["color"], day["weekIndex"], day["dayOfWeekIndex"]}
			}
			weeks[i] = days
		}
	}
	return body
}

// firstDifference names where two decoded replies first differ, so a
// failure does not print a year of days.
func firstDifference(got, want any) string {
	g, _ := got.(map[string]any)
	w, _ := want.(map[string]any)
	if g == nil || w == nil {
		return fmt.Sprintf("got %.300v, want %.300v", got, want)
	}
	for key := range w {
		if _, ok := g[key]; !ok {
			return "missing " + key
		}
	}
	for key, value := range g {
		if key != "grid" && !reflect.DeepEqual(value, w[key]) {
			return fmt.Sprintf("%s: got %v, want %v", key, value, w[key])
		}
	}
	gw, _ := g["grid"].([]any)
	ww, _ := w["grid"].([]any)
	if len(gw) != len(ww) {
		return fmt.Sprintf("grid has %d weeks, want %d", len(gw), len(ww))
	}
	for i := range ww {
		gd, _ := gw[i].([]any)
		wd, _ := ww[i].([]any)
		if len(gd) != len(wd) {
			return fmt.Sprintf("week %d has %d days, want %d", i, len(gd), len(wd))
		}
		for j := range wd {
			if !reflect.DeepEqual(gd[j], wd[j]) {
				return fmt.Sprintf("week %d day %d: got %v, want %v", i, j, gd[j], wd[j])
			}
		}
	}
	return "no difference found"
}

func plain(t *testing.T, raw json.RawMessage) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatal(err)
	}
	return value
}

// checkQuery compares the Data API requests with the query steps the
// contract records from supabase-js, written out as postgrest-js writes
// them in the URL.
func checkQuery(t *testing.T, requests []*http.Request, steps [][]any) {
	t.Helper()
	if len(steps) == 0 {
		if len(requests) != 0 {
			t.Errorf("the database was asked %d times; the contract says it is not asked", len(requests))
		}
		return
	}
	if len(requests) != 1 {
		t.Fatalf("the database was asked %d times, not once", len(requests))
	}
	r := requests[0]
	wantPath, wantPairs := postgrestURL(t, steps)
	if r.Method != http.MethodGet || r.URL.Path != wantPath {
		t.Errorf("asked %s %s, want GET %s", r.Method, r.URL.Path, wantPath)
	}
	var pairs [][2]string
	for _, part := range strings.Split(r.URL.RawQuery, "&") {
		name, value, _ := strings.Cut(part, "=")
		name, _ = url.QueryUnescape(name)
		value, _ = url.QueryUnescape(value)
		pairs = append(pairs, [2]string{name, value})
	}
	if !reflect.DeepEqual(pairs, wantPairs) {
		t.Errorf("query\n got  %q\n want %q", pairs, wantPairs)
	}
}

// postgrestURL turns recorded supabase-js steps into the path and the
// ordered query pairs postgrest-js sends for them. Only the steps this
// route uses are known; any other fails the test.
func postgrestURL(t *testing.T, steps [][]any) (string, [][2]string) {
	t.Helper()
	path := ""
	var pairs [][2]string
	for _, step := range steps {
		text := func(i int) string { s, _ := step[i].(string); return s }
		switch step[0] {
		case "from":
			path = "/rest/v1/" + text(1)
		case "select":
			// select() drops white space outside double quotes.
			quoted, columns := false, ""
			for _, c := range text(1) {
				if c == '"' {
					quoted = !quoted
				}
				if !quoted && strings.ContainsRune(" \t\n\r\f\v", c) {
					continue
				}
				columns += string(c)
			}
			pairs = append(pairs, [2]string{"select", columns})
		case "eq", "gte", "lte":
			pairs = append(pairs, [2]string{text(1), step[0].(string) + "." + text(2)})
		case "order":
			options, _ := step[2].(map[string]any)
			direction := "desc"
			if options["ascending"] == true {
				direction = "asc"
			}
			pairs = append(pairs, [2]string{"order", text(1) + "." + direction})
		default:
			t.Fatalf("the runner does not know the step %v", step)
		}
	}
	return path, pairs
}
