package aiprovider

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"reflect"
	"strings"
	"testing"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

func reply(status int, body string) (*http.Response, error) {
	return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
}

type recordedCall struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers"`
	Body    any               `json:"body"`
}

// The chat contract records the provider request for a one-message
// conversation. This client must build exactly that request.
func TestRequestMatchesTheChatContract(t *testing.T) {
	raw, err := os.ReadFile("../../../contracts/ai-chat/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Cases []struct {
			ID     string `json:"id"`
			Expect struct {
				Calls []recordedCall `json:"calls"`
			} `json:"expect"`
		} `json:"cases"`
	}
	if err = json.Unmarshal(raw, &contract); err != nil {
		t.Fatal(err)
	}
	var want *recordedCall
	for _, c := range contract.Cases {
		if c.ID == "single-user-message" {
			want = &c.Expect.Calls[0]
		}
	}
	if want == nil {
		t.Fatal("single-user-message is missing from the chat contract")
	}
	var got recordedCall
	client := &Client{Token: "fixture-models-token", HTTP: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		got.URL, got.Method, got.Headers = r.URL.String(), r.Method, map[string]string{}
		for name, values := range r.Header {
			got.Headers[strings.ToLower(name)] = strings.Join(values, ", ")
		}
		body, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(body, &got.Body); err != nil {
			t.Error(err)
		}
		return reply(200, `{"choices":[{"message":{"content":"Try TanStack Table."}}]}`)
	})}}
	content, err := client.Generate(context.Background(), []Message{{Role: "user", Content: "Find React table libraries"}}, Options{})
	if err != nil || content != "Try TanStack Table." {
		t.Fatalf("Generate = %v, %v", content, err)
	}
	if !reflect.DeepEqual(got, *want) {
		t.Errorf("request differs from the contract\n got: %+v\nwant: %+v", got, *want)
	}
}

func TestPromptsMatchTheContract(t *testing.T) {
	if !strings.HasPrefix(SystemPrompt, "You are SEFGH AI") || !strings.Contains(SystemPrompt, "```repos-json") {
		t.Errorf("SystemPrompt does not look like the application's instructions: %.60q", SystemPrompt)
	}
}

func TestSystemPromptIsAddedOnlyWhenTheConversationHasNone(t *testing.T) {
	roles := func(messages []Message) []string {
		var sent struct {
			Messages []Message `json:"messages"`
		}
		client := &Client{HTTP: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			body, _ := io.ReadAll(r.Body)
			json.Unmarshal(body, &sent)
			return reply(200, `{"choices":[{"message":{"content":"ok"}}]}`)
		})}}
		if _, err := client.Generate(context.Background(), messages, Options{}); err != nil {
			t.Fatal(err)
		}
		out := []string{}
		for _, m := range sent.Messages {
			out = append(out, m.Role)
		}
		return out
	}
	if got := roles([]Message{{Role: "user", Content: "hi"}}); !reflect.DeepEqual(got, []string{"system", "user"}) {
		t.Errorf("no system message sent in: roles %v", got)
	}
	if got := roles([]Message{{Role: "user", Content: "hi"}, {Role: "system", Content: "own"}}); !reflect.DeepEqual(got, []string{"user", "system"}) {
		t.Errorf("a system message sent in: roles %v, want it left alone", got)
	}
}

func TestOptionsReplaceTheDefaults(t *testing.T) {
	var sent map[string]any
	client := &Client{Endpoint: "https://models.test/x", HTTP: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if r.URL.String() != "https://models.test/x" {
			t.Errorf("called %s", r.URL)
		}
		body, _ := io.ReadAll(r.Body)
		json.Unmarshal(body, &sent)
		return reply(200, `{"choices":[{"message":{"content":"ok"}}]}`)
	})}}
	client.Generate(context.Background(), []Message{{Role: "user", Content: "hi"}}, Options{Model: "other", Temperature: 0.5, MaxTokens: 20})
	if sent["model"] != "other" || sent["temperature"] != 0.5 || sent["max_tokens"] != float64(20) {
		t.Errorf("sent %v", sent)
	}
}

func TestReplies(t *testing.T) {
	tests := []struct {
		name    string
		status  int
		body    string
		want    any
		wantErr bool
	}{
		{"text", 200, `{"choices":[{"message":{"content":"hello"}}]}`, "hello", false},
		{"first of several choices", 200, `{"choices":[{"message":{"content":"first"}},{"message":{"content":"second"}}]}`, "first", false},
		{"null content is passed on", 200, `{"choices":[{"message":{"content":null}}]}`, nil, false},
		{"object content is passed on", 200, `{"choices":[{"message":{"content":{"a":1}}}]}`, map[string]any{"a": json.Number("1")}, false},
		{"leading byte-order mark", 200, "\xef\xbb\xbf" + `{"choices":[{"message":{"content":"hello"}}]}`, "hello", false},
		{"choices as an object with a field 0", 200, `{"choices":{"0":{"message":{"content":"hello"}}}}`, "hello", false},
		{"error status, even with a usable body", 503, `{"choices":[{"message":{"content":"hello"}}]}`, nil, true},
		{"not JSON", 200, `{broken`, nil, true},
		{"no choices", 200, `{}`, nil, true},
		{"empty choices", 200, `{"choices":[]}`, nil, true},
		{"null first choice", 200, `{"choices":[null]}`, nil, true},
		{"choice without a message", 200, `{"choices":[{}]}`, nil, true},
		{"reply is a list", 200, `[]`, nil, true},
	}
	for _, tt := range tests {
		client := &Client{HTTP: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) { return reply(tt.status, tt.body) })}}
		got, err := client.Generate(context.Background(), []Message{{Role: "user", Content: "hi"}}, Options{})
		if (err != nil) != tt.wantErr || !reflect.DeepEqual(got, tt.want) {
			t.Errorf("%s: Generate = %#v, %v; want %#v, error %v", tt.name, got, err, tt.want, tt.wantErr)
		}
	}
}

// What the provider said is not repeated in the error, which is logged.
func TestErrorCarriesOnlyTheStatus(t *testing.T) {
	client := &Client{HTTP: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
		return reply(429, `the user typed: my secret plan`)
	})}}
	_, err := client.Generate(context.Background(), []Message{{Role: "user", Content: "hi"}}, Options{})
	if err == nil || !strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "secret") {
		t.Errorf("error = %v", err)
	}
}

func TestTransportFailureAndCancellation(t *testing.T) {
	client := &Client{HTTP: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		if err := r.Context().Err(); err != nil {
			return nil, err
		}
		return nil, errors.New("offline")
	})}}
	if _, err := client.Generate(context.Background(), []Message{{Role: "user", Content: "hi"}}, Options{}); err == nil {
		t.Error("offline: want an error")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := client.Generate(ctx, []Message{{Role: "user", Content: "hi"}}, Options{}); !errors.Is(err, context.Canceled) {
		t.Errorf("cancelled: error = %v", err)
	}
}

func TestOversizedReply(t *testing.T) {
	replies := map[string]string{
		"a long field": `{"choices":[{"message":{"content":"` + strings.Repeat("x", maxBodyBytes) + `"}}]}`,
		// A complete reply followed by white space. Reading stops at the
		// limit, so only the size check can refuse this one.
		"valid JSON followed by white space": `{"choices":[{"message":{"content":"hello"}}]}` + strings.Repeat(" ", maxBodyBytes),
	}
	for name, big := range replies {
		client := &Client{HTTP: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) { return reply(200, big) })}}
		if _, err := client.Generate(context.Background(), []Message{{Role: "user", Content: "hi"}}, Options{}); err == nil {
			t.Errorf("%s: want an error for a reply over the limit", name)
		}
	}
}
