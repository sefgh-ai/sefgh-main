// Package aiprovider calls GitHub Models the way src/lib/ai/github.js does,
// or any other OpenAI-compatible provider chosen in config.go. The request it
// builds is pinned by the provider requests recorded in contracts/ai-chat.
package aiprovider

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const (
	DefaultEndpoint = "https://models.inference.ai.azure.com/chat/completions"
	// Timeout bounds one provider call. The Next.js helper sets none. It must
	// stay below the server's write timeout; a test in cmd/api checks that.
	Timeout      = 25 * time.Second
	maxBodyBytes = 4 << 20
)

// Message is one entry of a conversation.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Options are the model settings of one call. The zero value means the
// defaults the Next.js helper uses.
type Options struct {
	Model       string
	Temperature float64
	MaxTokens   int
}

// Client holds what every call needs. Token is the provider's credential; it
// is sent to Endpoint and nowhere else. Model is used when a call names none;
// empty means gpt-4o, the GitHub Models default.
type Client struct {
	HTTP     *http.Client
	Endpoint string
	Token    string
	Model    string
}

type request struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens"`
}

// Undefined is what Generate returns when the first choice's message has no
// content field at all. JavaScript reads that field as undefined, and
// JSON.stringify leaves an undefined field out, so chat answers {} for it and
// {"response":null} for a content of null. A nil would lose the difference.
var Undefined any = undefined{}

type undefined struct{}

// Generate sends a conversation and returns the content of the first choice.
// The content is returned as it arrived: usually text, but the provider
// decides, and callers check. A nil error does not mean it is a string, and
// a missing content field is Undefined, not nil.
func (c *Client) Generate(ctx context.Context, messages []Message, options Options) (any, error) {
	if options.Model == "" {
		options.Model = c.Model
	}
	if options.Model == "" {
		options.Model = "gpt-4o"
	}
	if options.Temperature == 0 {
		options.Temperature = 0.7
	}
	if options.MaxTokens == 0 {
		options.MaxTokens = 1000
	}
	// The application's instructions go first unless the conversation
	// already has a system message of its own.
	hasSystem := false
	for _, message := range messages {
		if message.Role == "system" {
			hasSystem = true
			break
		}
	}
	if !hasSystem {
		messages = append([]Message{{Role: "system", Content: SystemPrompt}}, messages...)
	}
	payload, err := json.Marshal(request{Model: options.Model, Messages: messages, Temperature: options.Temperature, MaxTokens: options.MaxTokens})
	if err != nil {
		return nil, err
	}
	endpoint := c.Endpoint
	if endpoint == "" {
		endpoint = DefaultEndpoint
	}
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.Token)
	client := c.HTTP
	if client == nil {
		client = http.DefaultClient
	}
	// Provider credentials and conversation bodies stay at the configured
	// endpoint; even a same-host scheme/port redirect changes the origin.
	confined := *client
	confined.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := confined.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxBodyBytes {
		return nil, errors.New("provider reply too large")
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		// Only the status is kept. The provider's own text is not repeated,
		// not even in the server log, because it can echo what a user typed.
		return nil, fmt.Errorf("AI provider error: %d", resp.StatusCode)
	}
	data, err := jscompat.DecodeJSON(body)
	if err != nil {
		return nil, err
	}
	// data.choices[0].message.content, failing where JavaScript would throw.
	choice, ok := First(Field(data, "choices"))
	if !ok {
		return nil, errors.New("provider reply has no first choice")
	}
	message := Field(choice, "message")
	if message == nil {
		return nil, errors.New("provider reply has no message")
	}
	// A message that is not an object, such as a string, has no fields, so
	// its content is undefined too, as it is in JavaScript.
	object, _ := message.(map[string]any)
	content, present := object["content"]
	if !present {
		return Undefined, nil
	}
	return content, nil
}

// Field is value[name] for a decoded JSON value: the field of an object, and
// nothing for anything else.
func Field(value any, name string) any {
	object, _ := value.(map[string]any)
	return object[name]
}

// First is value[0] where JavaScript would find something it can read a
// field from: the first element of a list, or the field "0" of an object.
func First(value any) (any, bool) {
	switch v := value.(type) {
	case []any:
		if len(v) > 0 && v[0] != nil {
			return v[0], true
		}
	case map[string]any:
		if first, present := v["0"]; present && first != nil {
			return first, true
		}
	}
	return nil, false
}
