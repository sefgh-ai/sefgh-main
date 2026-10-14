package aichat

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aitest"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

// The same stand-ins as scripts/contracts/chat-fixture.mjs.
const (
	fixtureSupabaseURL = "https://contract-auth.invalid"
	fixtureSupabaseKey = "public-fixture-key"
	fixtureModelsToken = "fixture-models-token"
)

type supabaseAnswer struct {
	status int
	body   string
}

// What the stand-in Supabase answers for each session a fixture can name.
// Any other session is unknown to Supabase and refused.
var sessions = map[string]supabaseAnswer{
	"a":                 {200, `{"id":"user-a"}`},
	"b":                 {200, `{"id":"user-b"}`},
	"anonymous-account": {200, `{"id":"user-x","is_anonymous":true}`},
	"no-id":             {200, `{}`},
	"outage":            {503, `{}`},
}

var sessionHeader = regexp.MustCompile(`^Bearer session-(.+)$`)

type fixture struct {
	ID            string          `json:"id"`
	Body          json.RawMessage `json:"body"`
	JSONError     string          `json:"json_error"`
	Session       string          `json:"session"`
	Authorization *string         `json:"authorization"`
	Address       string          `json:"address"`
	Upstream      *struct {
		Status       int             `json:"status"`
		Body         json.RawMessage `json:"body"`
		RawBody      *string         `json:"raw_body"`
		NetworkError bool            `json:"network_error"`
	} `json:"upstream"`
	aitest.Earlier
	Expect struct {
		Status        int             `json:"status"`
		Body          json.RawMessage `json:"body"`
		ContentType   string          `json:"content_type"`
		Cache         *string         `json:"cache_control"`
		RetryAfter    *string         `json:"retry_after"`
		IdentityCalls int             `json:"identity_calls"`
		Calls         json.RawMessage `json:"calls"`
	} `json:"expect"`
}

func loadContract(t *testing.T) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/ai-chat/cases.json")
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

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

// stand-in answers Supabase and the provider for one fixture, and records
// what each was asked.
type standIn struct {
	t             *testing.T
	f             fixture
	mu            sync.Mutex
	identityCalls int
	calls         []any
}

func (s *standIn) RoundTrip(r *http.Request) (*http.Response, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	answer := func(status int, body string) (*http.Response, error) {
		return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(body))}, nil
	}
	if r.URL.String() == fixtureSupabaseURL+"/auth/v1/user" {
		s.identityCalls++
		if r.Header.Get("apikey") != fixtureSupabaseKey {
			return answer(401, `{}`)
		}
		session := ""
		if match := sessionHeader.FindStringSubmatch(r.Header.Get("Authorization")); match != nil {
			session = match[1]
		}
		known, ok := sessions[session]
		if !ok {
			return answer(401, `{}`)
		}
		return answer(known.status, known.body)
	}

	headers := map[string]any{}
	for name, values := range r.Header {
		headers[strings.ToLower(name)] = strings.Join(values, ", ")
	}
	raw, _ := io.ReadAll(r.Body)
	body, err := aitest.Decode(raw)
	if err != nil {
		s.t.Errorf("provider request body is not JSON: %s", raw)
	}
	s.calls = append(s.calls, map[string]any{"url": r.URL.String(), "method": r.Method, "headers": headers, "body": body})
	reply := s.f.Upstream
	if reply == nil {
		s.t.Error("unexpected provider request")
		return nil, errors.New("unexpected provider request")
	}
	if reply.NetworkError {
		return nil, errors.New("fetch failed")
	}
	if reply.RawBody != nil {
		return answer(reply.Status, *reply.RawBody)
	}
	return answer(reply.Status, string(reply.Body))
}

// Every case in contracts/ai-chat, once in memory and once through a real
// local socket. The same file drives the Next.js handler in
// scripts/contracts/ai-chat.test.mjs. The sign-in check and the provider
// client are the real ones; only their transport is a stand-in.
func TestContract(t *testing.T) {
	for _, f := range loadContract(t) {
		for _, mode := range []string{"memory", "socket"} {
			t.Run(f.ID+"/"+mode, func(t *testing.T) {
				upstream := &standIn{t: t, f: f}
				client := &http.Client{Transport: upstream}
				verifier := githubaccess.Verifier{SupabaseURL: fixtureSupabaseURL, SupabaseKey: fixtureSupabaseKey, Client: client}
				var userID string
				if known, ok := sessions[f.Session]; ok {
					var user struct {
						ID string `json:"id"`
					}
					json.Unmarshal([]byte(known.body), &user)
					userID = user.ID
				}
				h := &Handler{
					SignIn:  verifier.SignedInUser,
					Models:  &aiprovider.Client{HTTP: client, Token: fixtureModelsToken},
					Limiter: f.Earlier.Limiter(userID),
					Now:     func() time.Time { return aitest.Now },
					Logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
				}

				// A fixture with json_error stands for a body that cannot be
				// read as JSON at all. One with no body sends null, as the
				// Node runner does.
				body := []byte("{broken")
				if f.JSONError == "" {
					body = []byte("null")
					if len(f.Body) > 0 {
						expanded, err := aitest.Decode(f.Body)
						if err != nil {
							t.Fatalf("fixture body: %v", err)
						}
						body, _ = json.Marshal(expanded)
					}
				}
				authorization := ""
				if f.Authorization != nil {
					authorization = *f.Authorization
				} else if f.Session != "" {
					authorization = "Bearer session-" + f.Session
				}

				var status int
				var header http.Header
				var got []byte
				if mode == "socket" {
					server := httptest.NewServer(h)
					defer server.Close()
					req, _ := http.NewRequest("POST", server.URL+"/api/ai/chat", bytes.NewReader(body))
					setHeaders(req, authorization, f.Address)
					resp, err := http.DefaultClient.Do(req)
					if err != nil {
						t.Fatal(err)
					}
					got, _ = io.ReadAll(resp.Body)
					resp.Body.Close()
					status, header = resp.StatusCode, resp.Header
				} else {
					req := httptest.NewRequest("POST", "/api/ai/chat", bytes.NewReader(body))
					setHeaders(req, authorization, f.Address)
					rec := httptest.NewRecorder()
					h.ServeHTTP(rec, req)
					status, header, got = rec.Code, rec.Header(), rec.Body.Bytes()
				}

				wantBody, _ := aitest.Decode(f.Expect.Body)
				gotBody, err := aitest.Decode(got)
				if err != nil {
					t.Fatalf("reply is not JSON: %s", got)
				}
				if status != f.Expect.Status || !reflect.DeepEqual(gotBody, wantBody) {
					t.Errorf("got %d %s\nwant %d %s", status, got, f.Expect.Status, f.Expect.Body)
				}
				if header.Get("Content-Type") != f.Expect.ContentType || header.Get("Cache-Control") != "" || f.Expect.Cache != nil {
					t.Errorf("headers: content type %q, cache %q", header.Get("Content-Type"), header.Get("Cache-Control"))
				}
				retryAfter, wantRetry := header.Values("Retry-After"), []string(nil)
				if f.Expect.RetryAfter != nil {
					wantRetry = []string{*f.Expect.RetryAfter}
				}
				if !reflect.DeepEqual(retryAfter, wantRetry) {
					t.Errorf("Retry-After %q, want %q", retryAfter, wantRetry)
				}
				if upstream.identityCalls != f.Expect.IdentityCalls {
					t.Errorf("%d questions to Supabase, want %d", upstream.identityCalls, f.Expect.IdentityCalls)
				}
				wantCalls, _ := aitest.Decode(f.Expect.Calls)
				if gotCalls := aitest.Plain(upstream.calls); !reflect.DeepEqual(gotCalls, wantCalls) && !(len(upstream.calls) == 0 && len(wantCalls.([]any)) == 0) {
					t.Errorf("provider requests\n got %v\nwant %v", gotCalls, wantCalls)
				}
			})
		}
	}
}

func setHeaders(req *http.Request, authorization, address string) {
	req.Header.Set("Content-Type", "application/json")
	if authorization != "" {
		req.Header.Set("Authorization", authorization)
	}
	if address != "" {
		req.Header.Set("X-Forwarded-For", address)
	}
}
