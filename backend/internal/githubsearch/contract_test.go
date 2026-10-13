package githubsearch

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

// These tests run every case in contracts/github-search/cases.json, the same
// file that scripts/contracts/github-search.test.mjs runs against the Next.js
// handler.

type contract struct {
	URLPrefix      string                       `json:"upstream_url_prefix"`
	RequestHeaders map[string]map[string]string `json:"upstream_request_headers"`
	Upstream       map[string]upstreamReply     `json:"upstream_responses"`
	Responses      map[string]expectedReply     `json:"responses"`
	Cases          []contractCase               `json:"cases"`
}

type upstreamReply struct {
	Status       int               `json:"status"`
	Headers      map[string]string `json:"headers"`
	Body         json.RawMessage   `json:"body"`
	RawBody      *string           `json:"raw_body"`
	NetworkError bool              `json:"network_error"`
}

type expectedReply struct {
	Status  int               `json:"status"`
	Headers map[string]string `json:"headers"`
	Body    json.RawMessage   `json:"body"`
}

type contractCase struct {
	ID          string  `json:"id"`
	Disposition string  `json:"disposition"`
	Request     string  `json:"request"`
	GitHubToken string  `json:"github_token"`
	Upstream    *string `json:"upstream"`
	UpstreamURL *string `json:"expect_upstream_url"`
	Expect      string  `json:"expect"`
}

func loadContract(t *testing.T) contract {
	t.Helper()
	path := filepath.Join("..", "..", "..", "contracts", "github-search", "cases.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading contract: %v", err)
	}
	var c contract
	if err := json.Unmarshal(data, &c); err != nil {
		t.Fatalf("decoding contract: %v", err)
	}
	if len(c.Cases) == 0 {
		t.Fatal("contract has no cases")
	}
	return c
}

// lookup returns the stub reply and expected reply a case names, or fails.
func (c contract) lookup(t *testing.T, tc contractCase) (*upstreamReply, expectedReply) {
	t.Helper()
	if tc.Disposition != "preserve" && tc.Disposition != "defect" {
		t.Fatalf("unknown disposition %q", tc.Disposition)
	}
	expected, ok := c.Responses[tc.Expect]
	if !ok {
		t.Fatalf("unknown response %q", tc.Expect)
	}
	if tc.Upstream == nil {
		return nil, expected
	}
	reply, ok := c.Upstream[*tc.Upstream]
	if !ok {
		t.Fatalf("unknown upstream %q", *tc.Upstream)
	}
	return &reply, expected
}

func (u upstreamReply) bodyBytes() string {
	if u.RawBody != nil {
		return *u.RawBody
	}
	return string(u.Body)
}

var quietLogger = slog.New(slog.NewTextHandler(io.Discard, nil))

func TestContractCaseIDsAreUnique(t *testing.T) {
	seen := map[string]bool{}
	for _, tc := range loadContract(t).Cases {
		if seen[tc.ID] {
			t.Errorf("duplicate case id %q", tc.ID)
		}
		seen[tc.ID] = true
	}
}

// roundTripFunc lets a plain function stand in for the network.
type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// TestContract calls the handler in memory, with GitHub replaced by a stub
// transport. It checks the exact upstream URL and the exact header set.
func TestContract(t *testing.T) {
	c := loadContract(t)
	for _, tc := range c.Cases {
		t.Run(tc.ID, func(t *testing.T) {
			reply, expected := c.lookup(t, tc)

			var calls []*http.Request
			stub := roundTripFunc(func(req *http.Request) (*http.Response, error) {
				calls = append(calls, req)
				switch {
				case reply == nil:
					return nil, errors.New("upstream must not be called for this case")
				case reply.NetworkError:
					return nil, errors.New("connection reset by stub")
				}
				header := make(http.Header)
				for name, value := range reply.Headers {
					header.Set(name, value)
				}
				return &http.Response{
					StatusCode: reply.Status,
					Header:     header,
					Body:       io.NopCloser(strings.NewReader(reply.bodyBytes())),
					Request:    req,
				}, nil
			})

			h := &Handler{Client: &http.Client{Transport: stub}, Token: tc.GitHubToken, Logger: quietLogger}
			req := httptest.NewRequest(http.MethodGet, "/api/github/search", nil)
			req.URL.RawQuery = tc.Request
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			if tc.UpstreamURL == nil {
				if len(calls) != 0 {
					t.Fatalf("upstream was called: %s", calls[0].URL)
				}
			} else {
				if len(calls) != 1 {
					t.Fatalf("upstream calls = %d, want 1", len(calls))
				}
				if got, want := calls[0].URL.String(), c.URLPrefix+*tc.UpstreamURL; got != want {
					t.Errorf("upstream URL\n got: %s\nwant: %s", got, want)
				}
				got := map[string]string{}
				for name := range calls[0].Header {
					got[name] = calls[0].Header.Get(name)
				}
				if want := c.RequestHeaders[headerSet(tc)]; !reflect.DeepEqual(got, want) {
					t.Errorf("upstream headers = %v, want %v", got, want)
				}
			}

			checkReply(t, rec.Result(), expected)
		})
	}
}

// TestContractOverHTTP runs every case through real sockets: a real server
// parses the incoming request line, and a fake GitHub records the upstream
// request exactly as it arrived on the wire.
func TestContractOverHTTP(t *testing.T) {
	c := loadContract(t)
	for _, tc := range c.Cases {
		t.Run(tc.ID, func(t *testing.T) {
			reply, expected := c.lookup(t, tc)

			var received []*http.Request
			github := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				received = append(received, &http.Request{
					RequestURI: r.RequestURI,
					Header:     r.Header.Clone(),
				})
				switch {
				case reply == nil:
					http.Error(w, "upstream must not be called for this case", http.StatusTeapot)
					return
				case reply.NetworkError:
					conn, _, err := http.NewResponseController(w).Hijack()
					if err == nil {
						conn.Close() // drop the connection without a reply
					}
					return
				}
				for name, value := range reply.Headers {
					w.Header().Set(name, value)
				}
				w.WriteHeader(reply.Status)
				io.WriteString(w, reply.bodyBytes())
			}))
			defer github.Close()

			api := httptest.NewServer(&Handler{
				Client:  &http.Client{Timeout: 5 * time.Second},
				BaseURL: github.URL,
				Token:   tc.GitHubToken,
				Logger:  quietLogger,
			})
			defer api.Close()

			res, err := http.Get(api.URL + "/api/github/search?" + tc.Request)
			if err != nil {
				t.Fatalf("request: %v", err)
			}
			defer res.Body.Close()

			checkReply(t, res, expected)
			res.Body.Close()
			api.Close()
			github.Close() // join upstream handler goroutine before reading received

			if tc.UpstreamURL == nil {
				if len(received) != 0 {
					t.Fatalf("upstream was called: %s", received[0].RequestURI)
				}
			} else {
				if len(received) != 1 {
					t.Fatalf("upstream calls = %d, want 1", len(received))
				}
				if got, want := received[0].RequestURI, "/search/repositories?"+*tc.UpstreamURL; got != want {
					t.Errorf("upstream request target\n got: %s\nwant: %s", got, want)
				}
				// The transport adds its own headers, such as Accept-Encoding,
				// so on the wire only the contract's headers are checked.
				want := c.RequestHeaders[headerSet(tc)]
				for name, value := range want {
					if got := received[0].Header.Get(name); got != value {
						t.Errorf("upstream header %s = %q, want %q", name, got, value)
					}
				}
				if _, ok := want["Authorization"]; !ok && received[0].Header.Get("Authorization") != "" {
					t.Error("Authorization sent without a token")
				}
			}
		})
	}
}

func headerSet(tc contractCase) string {
	if tc.GitHubToken != "" {
		return "with_token"
	}
	return "without_token"
}

// checkReply compares a response with the contract: status, the headers the
// contract cares about, and the JSON body compared structurally.
func checkReply(t *testing.T, res *http.Response, want expectedReply) {
	t.Helper()
	if res.StatusCode != want.Status {
		t.Errorf("status = %d, want %d", res.StatusCode, want.Status)
	}

	wantHeaders := map[string]string{"Content-Type": "application/json", "Cache-Control": "", "Retry-After": ""}
	for name, value := range want.Headers {
		wantHeaders[http.CanonicalHeaderKey(name)] = value
	}
	for name, value := range wantHeaders {
		if got := res.Header.Get(name); got != value {
			t.Errorf("header %s = %q, want %q", name, got, value)
		}
	}

	data, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("reading body: %v", err)
	}
	var got, wantBody any
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("body is not JSON: %v\n%s", err, data)
	}
	if err := json.Unmarshal(want.Body, &wantBody); err != nil {
		t.Fatalf("contract body is not JSON: %v", err)
	}
	if !reflect.DeepEqual(got, wantBody) {
		t.Errorf("body\n got: %s\nwant: %s", data, want.Body)
	}
}
