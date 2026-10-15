package starred

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"sort"
	"strings"
	"sync"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

var discard = slog.New(slog.NewTextHandler(io.Discard, nil))

// Stand-ins: none of these addresses reaches a network.
const (
	fixtureSupabaseURL = "https://contract-supabase.invalid"
	fixtureSupabaseKey = "public-fixture-key"
	fixtureGitHubURL   = "https://contract-github.invalid"
	acceptedSession    = "session-accepted"
	refusedSession     = "session-refused"
)

type githubAnswer struct {
	Status       int             `json:"status"`
	Body         json.RawMessage `json:"body"`
	Raw          *string         `json:"raw"`
	NetworkError bool            `json:"network_error"`
	Redirect     bool            `json:"redirect"`
}

type githubCall struct {
	URL           string  `json:"url"`
	Accept        *string `json:"accept"`
	UserAgent     *string `json:"user_agent"`
	Authorization *string `json:"authorization"`
	Redirect      *string `json:"redirect"`
}

type fixture struct {
	ID           string                  `json:"id"`
	User         json.RawMessage         `json:"user"`
	ClientThrows bool                    `json:"client_throws"`
	Rows         json.RawMessage         `json:"rows"`
	QueryError   string                  `json:"query_error"`
	GitHub       map[string]githubAnswer `json:"github"`
	Expect       struct {
		Status      int             `json:"status"`
		Body        json.RawMessage `json:"body"`
		ContentType string          `json:"content_type"`
		Cache       *string         `json:"cache_control"`
		Query       [][]any         `json:"query"`
		GitHub      []githubCall    `json:"github"`
	} `json:"expect"`
}

func loadContract(t *testing.T) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/repo-starred/cases.json")
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

// standIn answers Supabase Auth, the Data API and GitHub for one fixture.
type standIn struct {
	t        *testing.T
	f        fixture
	mu       sync.Mutex
	database []*http.Request
	github   []githubCall
}

func (s *standIn) RoundTrip(r *http.Request) (*http.Response, error) {
	answer := func(status int, body string, header http.Header) (*http.Response, error) {
		if header == nil {
			header = http.Header{}
		}
		header.Set("Content-Type", "application/json")
		return &http.Response{StatusCode: status, Header: header, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.HasPrefix(r.URL.String(), fixtureGitHubURL+"/repos/") {
		header := func(name string) *string {
			if value := r.Header.Get(name); value != "" {
				return &value
			}
			return nil
		}
		s.github = append(s.github, githubCall{URL: strings.Replace(r.URL.String(), fixtureGitHubURL, "https://api.github.com", 1), Accept: header("Accept"), UserAgent: header("User-Agent"), Authorization: header("Authorization")})
		reply, listed := s.f.GitHub[strings.TrimPrefix(r.URL.Path, "/repos/")]
		switch {
		case !listed:
			return answer(404, `{"message":"Not Found"}`, nil)
		case reply.NetworkError:
			return nil, errors.New("fetch failed")
		case reply.Redirect:
			return answer(301, `{}`, http.Header{"Location": {"https://elsewhere.invalid/repos/x/y"}})
		case reply.Raw != nil:
			return answer(200, *reply.Raw, nil)
		}
		status := reply.Status
		if status == 0 {
			status = 200
		}
		return answer(status, string(reply.Body), nil)
	}
	if r.Header.Get("apikey") != fixtureSupabaseKey {
		s.t.Errorf("%s: a Supabase request without the public key: %s", s.f.ID, r.URL)
		return answer(401, `{}`, nil)
	}
	switch r.URL.Path {
	case "/auth/v1/user":
		if r.Header.Get("Authorization") != "Bearer "+acceptedSession {
			return answer(401, `{"msg":"invalid JWT"}`, nil)
		}
		return answer(200, string(s.f.User), nil)
	case "/rest/v1/repo_collections":
		s.database = append(s.database, r)
		if got := r.Header.Get("Authorization"); got != "Bearer "+acceptedSession {
			s.t.Errorf("%s: the database was asked with %q, not the user's token", s.f.ID, got)
		}
		if s.f.QueryError != "" {
			body, _ := json.Marshal(map[string]string{"code": "42501", "message": s.f.QueryError})
			return answer(403, string(body), nil)
		}
		rows := string(s.f.Rows)
		if rows == "" {
			rows = "[]"
		}
		return answer(200, rows, nil)
	}
	s.t.Errorf("%s: unexpected request to %s", s.f.ID, r.URL)
	return answer(404, `{}`, nil)
}

// serve runs one fixture through the real verifier and handler.
func serve(t *testing.T, f fixture) (*httptest.ResponseRecorder, *standIn) {
	t.Helper()
	stand := &standIn{t: t, f: f}
	client := &http.Client{Transport: stand}
	verifier := githubaccess.Verifier{SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Client: client}
	h := &Handler{
		User: verifier.User, Database: client,
		SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey,
		GitHub: client, GitHubURL: fixtureGitHubURL, Logger: discard,
	}
	if f.ClientThrows {
		h.SupabaseURL, h.SupabaseKey = "", ""
	}
	r := httptest.NewRequest(http.MethodGet, "/api/repo/starred", nil)
	switch {
	case len(f.User) == 0 || string(f.User) == "null":
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
			checkQuery(t, stand.database, f.Expect.Query)
			checkGitHub(t, stand.github, f.Expect.GitHub)
		})
	}
}

// checkQuery turns the recorded supabase-js steps into the URL postgrest-js
// sends and compares it with the one Go sent.
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
	var want []string
	for _, step := range steps {
		text := func(i int) string { s, _ := step[i].(string); return s }
		switch step[0] {
		case "from":
			if path := "/rest/v1/" + text(1); requests[0].URL.Path != path {
				t.Errorf("path %s, want %s", requests[0].URL.Path, path)
			}
		case "select":
			want = append(want, "select="+strings.Join(strings.Fields(text(1)), ""))
		case "eq":
			want = append(want, text(1)+"=eq."+text(2))
		case "order":
			direction := "desc"
			if options, _ := step[2].(map[string]any); options["ascending"] == true {
				direction = "asc"
			}
			want = append(want, "order="+text(1)+"."+direction)
		default:
			t.Fatalf("the runner does not know the step %v", step)
		}
	}
	var got []string
	for _, part := range strings.Split(requests[0].URL.RawQuery, "&") {
		decoded, _ := url.QueryUnescape(part)
		got = append(got, decoded)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("query %q, want %q", got, want)
	}
}

func checkGitHub(t *testing.T, got []githubCall, want []githubCall) {
	t.Helper()
	sort.Slice(got, func(i, j int) bool { return got[i].URL < got[j].URL })
	strip := func(calls []githubCall) []string {
		var out []string
		for _, c := range calls {
			deref := func(p *string) string {
				if p == nil {
					return "<none>"
				}
				return *p
			}
			out = append(out, fmt.Sprintf("%s accept=%s agent=%s auth=%s", c.URL, deref(c.Accept), deref(c.UserAgent), deref(c.Authorization)))
		}
		return out
	}
	if !reflect.DeepEqual(strip(got), strip(want)) {
		t.Errorf("GitHub requests\n got  %q\n want %q", strip(got), strip(want))
	}
	for _, c := range want {
		if c.Redirect == nil || *c.Redirect != "error" {
			t.Errorf("the contract expects redirects refused for %s", c.URL)
		}
	}
}
