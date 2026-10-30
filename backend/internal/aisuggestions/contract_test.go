package aisuggestions

import (
	"bytes"
	"context"
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

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aitest"
)

type fixture struct {
	ID         string          `json:"id"`
	Body       json.RawMessage `json:"body"`
	JSONError  string          `json:"json_error"`
	AIResponse json.RawMessage `json:"ai_response"`
	AIError    string          `json:"ai_error"`
	Address    string          `json:"address"`
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
	raw, err := os.ReadFile("../../../contracts/ai-suggestions/cases.json")
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

// Every case in contracts/ai-suggestions, once in memory and once through a
// real local socket. The same file drives the Next.js handler in
// scripts/contracts/ai-suggestions.test.mjs.
func TestContract(t *testing.T) {
	for _, f := range loadContract(t) {
		for _, mode := range []string{"memory", "socket"} {
			t.Run(f.ID+"/"+mode, func(t *testing.T) {
				var calls [][]aiprovider.Message
				key := f.Address
				if key == "" {
					key = "unknown"
				} else {
					key, _, _ = strings.Cut(key, ",")
				}
				h := &Handler{
					Limiter: f.Earlier.Limiter(key),
					Now:     func() time.Time { return aitest.Now },
					Logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
					Generate: func(ctx context.Context, messages []aiprovider.Message) (any, error) {
						calls = append(calls, messages)
						if f.AIError != "" {
							return nil, errors.New(f.AIError)
						}
						var content any
						if err := json.Unmarshal(f.AIResponse, &content); err != nil {
							t.Fatalf("fixture ai_response: %v", err)
						}
						return content, nil
					},
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
				var status int
				var header http.Header
				var got []byte
				if mode == "socket" {
					server := httptest.NewServer(h)
					defer server.Close()
					req, _ := http.NewRequest("POST", server.URL+"/api/ai/suggestions", bytes.NewReader(body))
					req.Header.Set("Content-Type", "application/json")
					if f.Address != "" {
						req.Header.Set("X-Forwarded-For", f.Address)
					}
					resp, err := http.DefaultClient.Do(req)
					if err != nil {
						t.Fatal(err)
					}
					got, _ = io.ReadAll(resp.Body)
					resp.Body.Close()
					status, header = resp.StatusCode, resp.Header
				} else {
					req := httptest.NewRequest("POST", "/api/ai/suggestions", bytes.NewReader(body))
					req.Header.Set("Content-Type", "application/json")
					if f.Address != "" {
						req.Header.Set("X-Forwarded-For", f.Address)
					}
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
				wantCalls, _ := aitest.Decode(f.Expect.Calls)
				if gotCalls := aitest.Plain(calls); !reflect.DeepEqual(gotCalls, wantCalls) && !(len(calls) == 0 && len(wantCalls.([]any)) == 0) {
					t.Errorf("AI calls\n got %v\nwant %v", gotCalls, wantCalls)
				}
				if header.Get("Content-Type") != f.Expect.ContentType || header.Get("Cache-Control") != "" || f.Expect.Cache != nil {
					t.Errorf("headers: content type %q, cache %q", header.Get("Content-Type"), header.Get("Cache-Control"))
				}
			})
		}
	}
}

// The built-in list is generated from the Next.js handler. This fails if
// someone edits one list and not the other.
func TestTermsMatchTheNextHandler(t *testing.T) {
	raw, err := os.ReadFile("../../../src/app/api/ai/suggestions/route.js")
	if err != nil {
		t.Fatal(err)
	}
	source := strings.ReplaceAll(string(raw), "\r\n", "\n")
	start := strings.Index(source, "const POPULAR_SEARCHES = [")
	end := strings.Index(source[start:], "\n]")
	if start < 0 || end < 0 {
		t.Fatal("POPULAR_SEARCHES not found in the Next.js handler")
	}
	list := source[start : start+end]
	if got := strings.Count(list, "',") + strings.Count(list, "'\n"); got != len(popularSearches) {
		t.Errorf("the Next.js handler lists %d terms, Go has %d", got, len(popularSearches))
	}
	position := 0
	for _, term := range popularSearches {
		at := strings.Index(list[position:], "'"+term+"'")
		if at < 0 {
			t.Fatalf("%q is missing from the Next.js list, or out of order", term)
		}
		position += at
	}
}

// A reply over the size limit is refused with the fixed sentence.
func TestOversizedRequestBody(t *testing.T) {
	h := &Handler{Logger: slog.New(slog.NewTextHandler(io.Discard, nil)), Generate: func(context.Context, []aiprovider.Message) (any, error) {
		t.Error("the AI was called")
		return nil, nil
	}}
	body := `{"query":"` + strings.Repeat("a", maxRequestBytes) + `"}`
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("POST", "/api/ai/suggestions", strings.NewReader(body)))
	if rec.Code != 500 || !strings.Contains(rec.Body.String(), "Failed to generate suggestions") {
		t.Errorf("got %d %s", rec.Code, rec.Body)
	}
}

// One record per failure, and the text a caller sent is not in it.
func TestFailuresAreLoggedWithoutTheQuery(t *testing.T) {
	var out bytes.Buffer
	h := &Handler{Logger: slog.New(slog.NewTextHandler(&out, nil)), Generate: func(context.Context, []aiprovider.Message) (any, error) {
		return nil, errors.New("offline")
	}}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("POST", "/api/ai/suggestions", strings.NewReader(`{"query":"my private project name"}`)))
	logged := out.String()
	if rec.Code != 200 || strings.Count(logged, "level=ERROR") != 1 || !strings.Contains(logged, "stage=ai_call") || strings.Contains(logged, "private") {
		t.Errorf("status %d, log:\n%s", rec.Code, logged)
	}
}
