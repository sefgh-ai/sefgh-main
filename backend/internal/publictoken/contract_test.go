package publictoken

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

type replySpec struct {
	Status int     `json:"status"`
	Scopes *string `json:"scopes"`
}

type contractCase struct {
	ID    string  `json:"id"`
	Token *string `json:"token"`
	// A null token in the file means "not set"; a missing one means the
	// file's default. json.RawMessage tells the two apart.
	RawToken json.RawMessage `json:"-"`
	User     struct {
		replySpec
		NetworkError bool `json:"network_error"`
	} `json:"user"`
	Requests []struct {
		AtSeconds      int        `json:"at_seconds"`
		Method         string     `json:"method"`
		URL            string     `json:"url"`
		Authorization  string     `json:"authorization"`
		ReplyWithToken *replySpec `json:"reply_with_token"`
		Expect         struct {
			Status int         `json:"status"`
			Body   string      `json:"body"`
			Calls  [][]*string `json:"calls"`
		} `json:"expect"`
	} `json:"requests"`
}

type contract struct {
	Version int    `json:"contract_version"`
	Origin  string `json:"origin"`
	Token   string `json:"token"`
	Cases   []contractCase
}

func loadContract(t *testing.T) contract {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/public-read-token/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var c contract
	var cases struct {
		Cases []map[string]json.RawMessage `json:"cases"`
	}
	if err = json.Unmarshal(raw, &c); err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(raw, &cases); err != nil {
		t.Fatal(err)
	}
	for i := range c.Cases {
		c.Cases[i].RawToken = cases.Cases[i]["token"]
	}
	if c.Version != 1 || len(c.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases", c.Version, len(c.Cases))
	}
	return c
}

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

func answer(status int, scopes *string, body string) *http.Response {
	header := http.Header{}
	if scopes != nil {
		header["X-Oauth-Scopes"] = []string{*scopes}
	}
	return &http.Response{StatusCode: status, Header: header, Body: io.NopCloser(strings.NewReader(body))}
}

// Every case in contracts/public-read-token. The same file drives
// createPublicReader in scripts/contracts/public-read-token.test.mjs.
func TestContract(t *testing.T) {
	file := loadContract(t)
	start := time.Date(2026, 10, 14, 12, 0, 0, 0, time.UTC)
	for _, c := range file.Cases {
		t.Run(c.ID, func(t *testing.T) {
			token := file.Token
			if len(c.RawToken) > 0 {
				token = ""
				if c.Token != nil {
					token = *c.Token
				}
			}
			clock := start
			var current int
			var calls [][]*string
			standIn := roundTrip(func(r *http.Request) (*http.Response, error) {
				var authorization *string
				if value := r.Header.Get("Authorization"); value != "" {
					authorization = &value
				}
				method, target := r.Method, r.URL.String()
				calls = append(calls, []*string{&method, &target, authorization})
				if target == file.Origin+"/user" {
					if c.User.NetworkError {
						return nil, errors.New("fetch failed")
					}
					return answer(c.User.Status, c.User.Scopes, "{}"), nil
				}
				if token != "" && authorization != nil && *authorization == "Bearer "+token {
					spec := c.Requests[current].ReplyWithToken
					if spec == nil {
						empty := ""
						spec = &replySpec{Status: 200, Scopes: &empty}
					}
					return answer(spec.Status, spec.Scopes, "public"), nil
				}
				return answer(200, nil, "plain"), nil
			})
			transport := &Transport{Token: token, Origin: Origin(file.Origin), Base: standIn,
				Now: func() time.Time { return clock }, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
			for i, r := range c.Requests {
				current, clock, calls = i, start.Add(time.Duration(r.AtSeconds)*time.Second), nil
				req, err := http.NewRequest(r.Method, r.URL, nil)
				if err != nil {
					t.Fatal(err)
				}
				if r.Authorization != "" {
					req.Header.Set("Authorization", r.Authorization)
				}
				before := req.Header.Clone()
				resp, err := transport.RoundTrip(req)
				if err != nil {
					t.Fatalf("request %d: %v", i+1, err)
				}
				body, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				if resp.StatusCode != r.Expect.Status || string(body) != r.Expect.Body {
					t.Errorf("request %d: got %d %q, want %d %q", i+1, resp.StatusCode, body, r.Expect.Status, r.Expect.Body)
				}
				if !reflect.DeepEqual(plain(calls), plain(r.Expect.Calls)) {
					t.Errorf("request %d: calls\n got %v\nwant %v", i+1, plain(calls), plain(r.Expect.Calls))
				}
				if !reflect.DeepEqual(req.Header, before) {
					t.Errorf("request %d: the caller's request was changed: %v", i+1, req.Header)
				}
			}
		})
	}
}

// plain turns calls into comparable text, with null as "<none>".
func plain(calls [][]*string) []string {
	out := []string{}
	for _, call := range calls {
		parts := []string{}
		for _, part := range call {
			if part == nil {
				parts = append(parts, "<none>")
			} else {
				parts = append(parts, *part)
			}
		}
		out = append(out, strings.Join(parts, " "))
	}
	return out
}

func TestTimingsMatchNextJS(t *testing.T) {
	if TrustFor != 10*time.Minute || RetryAfter != time.Minute || CheckTimeout != 4*time.Second {
		t.Errorf("TrustFor %v, RetryAfter %v, CheckTimeout %v; src/lib/github/public-token.js uses 10 minutes, 1 minute and 4 seconds", TrustFor, RetryAfter, CheckTimeout)
	}
}

// Requests that arrive during a check wait for it; there is one check.
func TestOneCheckForEveryoneWaiting(t *testing.T) {
	release := make(chan struct{})
	var mu sync.Mutex
	checks := 0
	empty := ""
	transport := &Transport{Token: "p", Origin: "https://api.github.test", Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		Base: roundTrip(func(r *http.Request) (*http.Response, error) {
			if r.URL.Path == "/user" {
				mu.Lock()
				checks++
				mu.Unlock()
				<-release
				return answer(200, &empty, "{}"), nil
			}
			return answer(200, &empty, r.Header.Get("Authorization")), nil
		})}
	var wg sync.WaitGroup
	got := make([]string, 8)
	for i := range got {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			req, _ := http.NewRequest("GET", "https://api.github.test/r", nil)
			resp, err := transport.RoundTrip(req)
			if err != nil {
				t.Error(err)
				return
			}
			body, _ := io.ReadAll(resp.Body)
			got[i] = string(body)
		}(i)
	}
	time.Sleep(20 * time.Millisecond)
	close(release)
	wg.Wait()
	for i, body := range got {
		if body != "Bearer p" {
			t.Errorf("request %d sent %q", i, body)
		}
	}
	if checks != 1 {
		t.Errorf("%d checks for 8 requests at once, want 1", checks)
	}
}

// A caller who gives up does not cut the shared check short.
func TestACancelledCallerDoesNotSpoilTheCheck(t *testing.T) {
	empty := ""
	transport := &Transport{Token: "p", Origin: "https://api.github.test", Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		Base: roundTrip(func(r *http.Request) (*http.Response, error) {
			if err := r.Context().Err(); err != nil {
				return nil, err
			}
			return answer(200, &empty, "ok"), nil
		})}
	req, _ := http.NewRequest("GET", "https://api.github.test/r", nil)
	ctx, cancel := contextCancelled()
	defer cancel()
	transport.RoundTrip(req.WithContext(ctx))
	transport.mu.Lock()
	usable := transport.usable
	transport.mu.Unlock()
	if !usable {
		t.Error("a check started by a cancelled request failed")
	}
}

func contextCancelled() (context.Context, context.CancelFunc) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	return ctx, cancel
}

func TestTheTokenIsNeverLogged(t *testing.T) {
	var out bytes.Buffer
	scopes := "repo"
	transport := &Transport{Token: "secret-public-token", Origin: "https://api.github.test", Logger: slog.New(slog.NewTextHandler(&out, nil)),
		Base: roundTrip(func(r *http.Request) (*http.Response, error) { return answer(200, &scopes, "{}"), nil })}
	req, _ := http.NewRequest("GET", "https://api.github.test/r", nil)
	transport.RoundTrip(req)
	if !strings.Contains(out.String(), "scopes repo") || strings.Contains(out.String(), "secret-public-token") {
		t.Errorf("log:\n%s", out.String())
	}
}

// The handlers build URLs with jscompat.FetchURL, which keeps the path in
// Opaque. Such a URL is still on the GitHub API origin.
func TestRequestsBuiltByFetchURLGetTheToken(t *testing.T) {
	empty := ""
	var sent string
	transport := &Transport{Token: "p", Origin: "https://api.github.test", Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		Base: roundTrip(func(r *http.Request) (*http.Response, error) {
			if r.URL.Path != "/user" {
				sent = r.Header.Get("Authorization")
			}
			return answer(200, &empty, "{}"), nil
		})}
	parsed, err := jscompat.FetchURL("https://api.github.test/repos/o/r%2Fx")
	if err != nil {
		t.Fatal(err)
	}
	req, _ := http.NewRequest("GET", "https://api.github.test", nil)
	req.URL, req.Host = parsed, parsed.Host
	if _, err := transport.RoundTrip(req); err != nil || sent != "Bearer p" {
		t.Errorf("sent %q, %v; want the public token", sent, err)
	}
}

func TestOrigin(t *testing.T) {
	for in, want := range map[string]string{
		"https://api.github.com":       "https://api.github.com",
		"https://API.GitHub.com/":      "https://api.github.com",
		"https://api.github.com:443/x": "https://api.github.com",
		"http://127.0.0.1:8080/repos":  "http://127.0.0.1:8080",
		"http://example.test:80":       "http://example.test",
		"https://example.test:80":      "https://example.test:80",
		"not a url":                    "",
		"/relative/path":               "",
	} {
		if got := Origin(in); got != want {
			t.Errorf("Origin(%q) = %q, want %q", in, got, want)
		}
	}
}
