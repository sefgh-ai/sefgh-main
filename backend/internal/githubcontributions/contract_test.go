package githubcontributions

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

// These tests run every case in contracts/github-contributions/cases.json,
// the file scripts/contracts/github-contributions.test.mjs runs against the
// Next.js handler. Each case fixes GitHub's reply, the clock and the zone.

type contract struct {
	Version    int            `json:"contract_version"`
	GraphQLURL string         `json:"graphql_url"`
	Query      string         `json:"query"`
	Cases      []contractCase `json:"cases"`
}

type contractCase struct {
	ID          string         `json:"id"`
	Disposition string         `json:"disposition"`
	Request     string         `json:"request"`
	GitHubToken string         `json:"github_token"`
	Now         string         `json:"now"`
	TimeZone    string         `json:"time_zone"`
	Calls       []contractCall `json:"calls"`
	Expect      struct {
		Status int             `json:"status"`
		Body   json.RawMessage `json:"body"`
	} `json:"expect"`
}

type contractCall struct {
	URL          string            `json:"url"`
	Method       string            `json:"method"`
	Headers      map[string]string `json:"headers"`
	Variables    json.RawMessage   `json:"variables"`
	Status       int               `json:"status"`
	Body         json.RawMessage   `json:"body"`
	RawBody      *string           `json:"raw_body"`
	NetworkError bool              `json:"network_error"`
}

func (c contractCall) replyBody() string {
	if c.RawBody != nil {
		return *c.RawBody
	}
	return string(c.Body)
}

func loadContract(t *testing.T) contract {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "..", "contracts", "github-contributions", "cases.json"))
	if err != nil {
		t.Fatalf("reading contract: %v", err)
	}
	var c contract
	if err := json.Unmarshal(data, &c); err != nil {
		t.Fatalf("decoding contract: %v", err)
	}
	if c.Version != 4 || len(c.Cases) == 0 {
		t.Fatal("contract has no cases")
	}
	return c
}

var quietLogger = slog.New(slog.NewTextHandler(io.Discard, nil))

// handlerFor builds a handler whose clock and zone are the ones the case names.
func handlerFor(t *testing.T, tc contractCase, client *http.Client, baseURL string) *Handler {
	t.Helper()
	now, err := time.Parse(time.RFC3339Nano, tc.Now)
	if err != nil {
		t.Fatalf("case clock: %v", err)
	}
	loc, err := time.LoadLocation(tc.TimeZone)
	if err != nil {
		t.Fatalf("case time zone: %v", err)
	}
	return &Handler{
		Client:  client,
		BaseURL: baseURL,
		Token:   tc.GitHubToken,
		Logger:  quietLogger,
		Now:     func() time.Time { return now.In(loc) },
	}
}

func TestQueryMatchesTheContract(t *testing.T) {
	if c := loadContract(t); query != c.Query {
		t.Errorf("query constant differs from the recorded GraphQL text\n got: %q\nwant: %q", query, c.Query)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// TestContract calls the handler in memory, with GitHub replaced by a stub
// transport. It checks the exact URL, method, header set and request body.
func TestContract(t *testing.T) {
	c := loadContract(t)
	for _, tc := range c.Cases {
		t.Run(tc.ID, func(t *testing.T) {
			calls := 0
			stub := roundTripFunc(func(req *http.Request) (*http.Response, error) {
				i := calls
				calls++
				if i >= len(tc.Calls) {
					t.Error("unexpected upstream request")
					return nil, errors.New("unexpected upstream request")
				}
				want := tc.Calls[i]
				if req.Method != want.Method || req.URL.String() != want.URL {
					t.Errorf("upstream request = %s %s, want %s %s", req.Method, req.URL, want.Method, want.URL)
				}
				got := map[string]string{}
				for name := range req.Header {
					got[name] = req.Header.Get(name)
				}
				if !reflect.DeepEqual(got, want.Headers) {
					t.Errorf("upstream headers = %v, want %v", got, want.Headers)
				}
				sent, _ := io.ReadAll(req.Body)
				checkGraphQLBody(t, sent, c.Query, want.Variables)
				if want.NetworkError {
					return nil, errors.New("connection reset by stub")
				}
				return &http.Response{
					StatusCode: want.Status,
					Header:     http.Header{},
					Body:       io.NopCloser(strings.NewReader(want.replyBody())),
					Request:    req,
				}, nil
			})

			h := handlerFor(t, tc, &http.Client{Transport: stub}, "")
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.URL.Path, req.URL.RawQuery, _ = strings.Cut(tc.Request, "?")
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			if calls != len(tc.Calls) {
				t.Errorf("upstream calls = %d, want %d", calls, len(tc.Calls))
			}
			checkReply(t, rec.Result(), tc)
		})
	}
}

// TestContractOverHTTP runs every case through real sockets: a real server
// parses the incoming request, and a fake GitHub records the GraphQL request
// as it arrived on the wire.
func TestContractOverHTTP(t *testing.T) {
	c := loadContract(t)
	for _, tc := range c.Cases {
		t.Run(tc.ID, func(t *testing.T) {
			calls := 0
			github := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				i := calls
				calls++
				if i >= len(tc.Calls) {
					t.Error("unexpected upstream request")
					w.WriteHeader(http.StatusTeapot)
					return
				}
				want := tc.Calls[i]
				if r.Method != want.Method || r.RequestURI != "/graphql" {
					t.Errorf("upstream request = %s %s, want %s /graphql", r.Method, r.RequestURI, want.Method)
				}
				// The transport adds headers of its own, so on the wire only
				// the contract's headers are checked.
				for name, value := range want.Headers {
					if got := r.Header.Get(name); got != value {
						t.Errorf("upstream header %s = %q, want %q", name, got, value)
					}
				}
				sent, _ := io.ReadAll(r.Body)
				checkGraphQLBody(t, sent, c.Query, want.Variables)
				if want.NetworkError {
					if conn, _, err := http.NewResponseController(w).Hijack(); err == nil {
						conn.Close() // drop the connection without a reply
					}
					return
				}
				w.WriteHeader(want.Status)
				io.WriteString(w, want.replyBody())
			}))
			defer github.Close()

			api := httptest.NewServer(handlerFor(t, tc, &http.Client{Timeout: 5 * time.Second}, github.URL))
			defer api.Close()

			res, err := http.Get(api.URL + tc.Request)
			if err != nil {
				t.Fatalf("request: %v", err)
			}
			defer res.Body.Close()

			checkReply(t, res, tc)
			res.Body.Close()
			api.Close()
			github.Close() // join upstream handler goroutine before reading calls

			if calls != len(tc.Calls) {
				t.Errorf("upstream calls = %d, want %d", calls, len(tc.Calls))
			}
		})
	}
}

// checkGraphQLBody compares what was sent with {query, variables}.
func checkGraphQLBody(t *testing.T, sent []byte, wantQuery string, wantVariables json.RawMessage) {
	t.Helper()
	var got struct {
		Query     string `json:"query"`
		Variables any    `json:"variables"`
	}
	if err := json.Unmarshal(sent, &got); err != nil {
		t.Errorf("upstream body is not JSON: %v", err)
		return
	}
	var want any
	if err := json.Unmarshal(wantVariables, &want); err != nil {
		t.Fatalf("contract variables: %v", err)
	}
	if got.Query != wantQuery {
		t.Error("upstream query text differs from the contract")
	}
	if !reflect.DeepEqual(got.Variables, want) {
		t.Errorf("upstream variables = %v, want %v", got.Variables, want)
	}
}

// checkReply compares a response with the contract: status, the headers the
// contract cares about, and the JSON body compared structurally.
func checkReply(t *testing.T, res *http.Response, tc contractCase) {
	t.Helper()
	if res.StatusCode != tc.Expect.Status {
		t.Errorf("status = %d, want %d", res.StatusCode, tc.Expect.Status)
	}
	for name, value := range map[string]string{"Content-Type": "application/json", "Cache-Control": "", "Retry-After": ""} {
		if got := res.Header.Get(name); got != value {
			t.Errorf("header %s = %q, want %q", name, got, value)
		}
	}
	data, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("reading body: %v", err)
	}
	var got, want any
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("body is not JSON: %v\n%s", err, data)
	}
	if err := json.Unmarshal(tc.Expect.Body, &want); err != nil {
		t.Fatalf("contract body is not JSON: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("body\n got: %s\nwant: %s", data, tc.Expect.Body)
	}
}
