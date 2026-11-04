package aienhance

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
	"strings"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aitest"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

type fixture struct {
	ID        string            `json:"id"`
	Body      json.RawMessage   `json:"body"`
	JSONError string            `json:"json_error"`
	Env       map[string]string `json:"env"`
	Address   string            `json:"address"`
	Upstream  *struct {
		Status  int             `json:"status"`
		Body    json.RawMessage `json:"body"`
		Raw     *string         `json:"raw_body"`
		Network bool            `json:"network_error"`
	} `json:"upstream"`
	aitest.Earlier
	Expect struct {
		Status      int             `json:"status"`
		Body        json.RawMessage `json:"body"`
		Calls       json.RawMessage `json:"calls"`
		ContentType string          `json:"content_type"`
		Cache       *string         `json:"cache_control"`
	} `json:"expect"`
}

func loadContract(t *testing.T) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/ai-enhance-query/cases.json")
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
	if contract.Version != 4 || len(contract.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases", contract.Version, len(contract.Cases))
	}
	return contract.Cases
}

// Every case in contracts/ai-enhance-query, once in memory and once through
// a real local socket. The same file drives the Next.js handler in
// scripts/contracts/ai-enhance-query.test.mjs.
func TestContract(t *testing.T) {
	for _, f := range loadContract(t) {
		for _, mode := range []string{"memory", "socket"} {
			t.Run(f.ID+"/"+mode, func(t *testing.T) {
				calls := []any{}
				key := "unknown"
				if f.Address != "" {
					key, _, _ = strings.Cut(f.Address, ",")
				}
				h := &Handler{
					OpenAIKey:    f.Env["OPENAI_API_KEY"],
					AnthropicKey: f.Env["ANTHROPIC_API_KEY"],
					Limiter:      f.Earlier.Limiter(key),
					Now:          func() time.Time { return aitest.Now },
					Logger:       slog.New(slog.NewTextHandler(io.Discard, nil)),
					Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
						sent, _ := io.ReadAll(r.Body)
						var body any
						if err := json.Unmarshal(sent, &body); err != nil {
							t.Errorf("provider request body is not JSON: %s", sent)
						}
						headers := map[string]any{}
						for name, values := range r.Header {
							headers[strings.ToLower(name)] = strings.Join(values, ", ")
						}
						calls = append(calls, map[string]any{"url": r.URL.String(), "method": r.Method, "headers": headers, "body": body})
						if f.Upstream == nil {
							return nil, errors.New("unexpected provider request")
						}
						if f.Upstream.Network {
							return nil, errors.New("fetch failed")
						}
						reply := string(f.Upstream.Body)
						if f.Upstream.Raw != nil {
							reply = *f.Upstream.Raw
						}
						return &http.Response{StatusCode: f.Upstream.Status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(reply))}, nil
					})},
				}
				// A fixture with json_error stands for a body that cannot be
				// read as JSON at all.
				body := []byte("{broken")
				if f.JSONError == "" {
					expanded, err := aitest.Decode(f.Body)
					if err != nil {
						t.Fatalf("fixture body: %v", err)
					}
					body, _ = json.Marshal(expanded)
				}
				newRequest := func(target string) *http.Request {
					req, _ := http.NewRequest("POST", target, bytes.NewReader(body))
					req.Header.Set("Content-Type", "application/json")
					if f.Address != "" {
						req.Header.Set("X-Forwarded-For", f.Address)
					}
					return req
				}
				var status int
				var header http.Header
				var got []byte
				if mode == "socket" {
					server := httptest.NewServer(h)
					defer server.Close()
					resp, err := http.DefaultClient.Do(newRequest(server.URL + "/api/ai/enhance-query"))
					if err != nil {
						t.Fatal(err)
					}
					got, _ = io.ReadAll(resp.Body)
					resp.Body.Close()
					status, header = resp.StatusCode, resp.Header
				} else {
					rec := httptest.NewRecorder()
					h.ServeHTTP(rec, newRequest("/api/ai/enhance-query"))
					status, header, got = rec.Code, rec.Header(), rec.Body.Bytes()
				}

				wantBody, _ := aitest.Decode(f.Expect.Body)
				gotBody, err := aitest.Decode(got)
				if err != nil {
					t.Fatalf("reply is not JSON: %s", got)
				}
				if status != f.Expect.Status || !reflect.DeepEqual(gotBody, wantBody) {
					t.Errorf("got %d %.300s\nwant %d %.300s", status, got, f.Expect.Status, f.Expect.Body)
				}
				wantCalls, _ := aitest.Decode(f.Expect.Calls)
				if gotCalls := aitest.Plain(calls); !reflect.DeepEqual(gotCalls, wantCalls) {
					t.Errorf("provider requests\n got %v\nwant %v", gotCalls, wantCalls)
				}
				if header.Get("Content-Type") != f.Expect.ContentType || header.Get("Cache-Control") != "" || f.Expect.Cache != nil {
					t.Errorf("headers: content type %q, cache %q", header.Get("Content-Type"), header.Get("Cache-Control"))
				}
			})
		}
	}
}

func provider(status int, body string) roundTrip {
	return func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
	}
}

func post(h *Handler, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("POST", "/api/ai/enhance-query", strings.NewReader(body)))
	return rec
}

// One record per failure. Neither the query nor the provider's own words
// are in it, and nothing of either reaches the caller.
func TestFailuresAreLoggedWithoutTheQueryOrTheProvidersWords(t *testing.T) {
	var out bytes.Buffer
	h := &Handler{OpenAIKey: "fixture-openai-key", Logger: slog.New(slog.NewTextHandler(&out, nil)),
		Client: &http.Client{Transport: provider(401, `{"error":{"message":"Incorrect API key provided: fixture-openai-key"}}`)}}
	rec := post(h, `{"query":"my private project name"}`)
	logged := out.String()
	if rec.Code != 200 || strings.Count(logged, "level=ERROR") != 1 || !strings.Contains(logged, "stage=provider") || !strings.Contains(logged, "401") {
		t.Errorf("status %d, log:\n%s", rec.Code, logged)
	}
	for _, secret := range []string{"private", "Incorrect API key", "fixture-openai-key"} {
		if strings.Contains(logged, secret) || (secret != "private" && strings.Contains(rec.Body.String(), secret)) {
			t.Errorf("%q appears in the log or the reply:\n%s\n%s", secret, logged, rec.Body)
		}
	}
}

func TestOversizedBodies(t *testing.T) {
	quiet := slog.New(slog.NewTextHandler(io.Discard, nil))
	h := &Handler{OpenAIKey: "fixture-openai-key", Logger: quiet, Client: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
		t.Error("a provider was called for an oversized request")
		return nil, errors.New("unexpected")
	})}}
	if rec := post(h, `{"query":"`+strings.Repeat("a", maxRequestBytes)+`"}`); rec.Code != 500 {
		t.Errorf("oversized request: status %d, want 500", rec.Code)
	}
	replies := map[string]string{
		"a long field": `{"choices":[{"message":{"content":"` + strings.Repeat("x", maxReplyBytes) + `"}}]}`,
		// A complete reply followed by white space. Reading stops at the
		// limit, so only the size check can refuse this one.
		"valid JSON followed by white space": `{"choices":[{"message":{"content":"ok"}}]}` + strings.Repeat(" ", maxReplyBytes),
	}
	for name, big := range replies {
		h = &Handler{OpenAIKey: "fixture-openai-key", Logger: quiet, Client: &http.Client{Transport: provider(200, big)}}
		if rec := post(h, `{"query":"charts"}`); rec.Code != 200 || !strings.Contains(rec.Body.String(), `"enhancedQuery":"charts"`) || !strings.Contains(rec.Body.String(), `"source":"basic-enhancement"`) {
			t.Errorf("oversized provider reply, %s: status %d, want basic fallback200", name, rec.Code)
		}
	}
}

// R-214: when the helper uses the shared provider, that provider's reasoning
// effort goes with the request. Without one no field is added, which keeps
// every contract request as it was.
func TestReasoningEffortGoesToTheSharedProvider(t *testing.T) {
	for _, effort := range []string{"none", ""} {
		var sent map[string]any
		h := Handler{OpenAIKey: "k", OpenAIURL: "https://router.test/v1", OpenAIModel: "m", OpenAIReasoning: effort,
			Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
		h.Client = &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			body, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(body, &sent)
			return provider(200, `{"choices":[{"message":{"content":"charts library"}}]}`)(r)
		})}
		if rec := post(&h, `{"query":"charts"}`); rec.Code != 200 || !strings.Contains(rec.Body.String(), "ai-powered") {
			t.Fatalf("effort %q: %d %s", effort, rec.Code, rec.Body)
		}
		got, present := sent["reasoning_effort"]
		if effort == "" && present || effort != "" && got != effort {
			t.Errorf("effort %q: sent %v", effort, sent)
		}
		if sent["max_tokens"] != float64(100) || sent["model"] != "m" {
			t.Errorf("effort %q changed the rest of the request: %v", effort, sent)
		}
	}
}

// Each key goes only to its own provider, at the address configured for it.
func TestKeysGoOnlyToTheirOwnProvider(t *testing.T) {
	for _, tt := range []struct {
		name          string
		handler       Handler
		wantURL       string
		wantHeader    string
		wantValue     string
		forbidHeader  string
		providerReply string
	}{
		{"OpenAI", Handler{OpenAIKey: "fixture-openai-key", AnthropicKey: "fixture-anthropic-key", OpenAIURL: "https://openai.test/v1"}, "https://openai.test/v1", "Authorization", "Bearer fixture-openai-key", "X-Api-Key", `{"choices":[{"message":{"content":"ok"}}]}`},
		{"Anthropic", Handler{AnthropicKey: "fixture-anthropic-key", AnthropicURL: "https://anthropic.test/v1"}, "https://anthropic.test/v1", "X-Api-Key", "fixture-anthropic-key", "Authorization", `{"content":[{"text":"ok"}]}`},
	} {
		h := tt.handler
		h.Logger = slog.New(slog.NewTextHandler(io.Discard, nil))
		h.Client = &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			if r.URL.String() != tt.wantURL || r.Header.Get(tt.wantHeader) != tt.wantValue || r.Header.Get(tt.forbidHeader) != "" {
				t.Errorf("%s: called %s with %s=%q and %s=%q", tt.name, r.URL, tt.wantHeader, r.Header.Get(tt.wantHeader), tt.forbidHeader, r.Header.Get(tt.forbidHeader))
			}
			return provider(200, tt.providerReply)(r)
		})}
		if rec := post(&h, `{"query":"charts"}`); rec.Code != 200 {
			t.Errorf("%s: status %d %s", tt.name, rec.Code, rec.Body)
		}
	}
}
