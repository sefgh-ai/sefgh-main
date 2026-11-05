// Package aienhance answers enhance-query under contract v4.
// Approved Go fixes are pinned separately from unchanged Next rollback replies.
package aienhance

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/ailimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const (
	DefaultOpenAIURL    = "https://api.openai.com/v1/chat/completions"
	DefaultAnthropicURL = "https://api.anthropic.com/v1/messages"
	// Timeout bounds one provider call. The Next.js handler sets none.
	Timeout = aiprovider.Timeout

	maxRequestBytes = 1 << 20
	maxReplyBytes   = 4 << 20
)

// Handler answers enhance-query requests. With OpenAIKey set it asks OpenAI,
// or the OpenAI-compatible service at OpenAIURL with OpenAIModel; otherwise,
// with AnthropicKey set, Anthropic; with neither it uses the word lists below
// and calls nobody.
type Handler struct {
	Client       *http.Client
	OpenAIKey    string
	AnthropicKey string
	OpenAIURL    string
	AnthropicURL string
	// OpenAIModel is empty for OpenAI itself, which means gpt-3.5-turbo.
	OpenAIModel string
	// OpenAIReasoning is sent as reasoning_effort when it is not empty. It is
	// set only when this helper uses the AI routes' shared provider (R-214).
	OpenAIReasoning string
	Limiter         *ailimit.Limiter
	Now             func() time.Time
	Logger          *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	r, stop := ailimit.BoundRequest(w, r)
	defer stop()
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxRequestBytes))
	if err != nil {
		h.fail(w, "read_body", err)
		return
	}
	decoded, err := jscompat.DecodeJSON(body)
	if err != nil {
		h.fail(w, "decode_body", err)
		return
	}
	if decoded == nil {
		write(w, 400, map[string]any{"error": "Query is required"})
		return
	}
	// A body that is not an object has no query. A query that is not text
	// is "required" whatever length it claims: the type is checked first.
	object, _ := decoded.(map[string]any)
	query, isText := object["query"].(string)
	if !isText || jscompat.Trim(query) == "" {
		write(w, 400, map[string]any{"error": "Query is required"})
		return
	}
	if jscompat.UTF16Len(query) > ailimit.QueryCharacters {
		write(w, 400, map[string]any{"error": "Query is too long"})
		return
	}

	// AI calls have an allowance per address. Past it, the basic enhancement
	// still answers, so the button keeps working. With no key there is no AI
	// call, and the allowance is not touched.
	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	hasKey := h.OpenAIKey != "" || h.AnthropicKey != ""
	if !hasKey || (h.Limiter != nil && h.Limiter.Take(ailimit.ClientAddress(r), now()) > 0) {
		write(w, 200, map[string]any{"enhancedQuery": enhanceBasic(query), "source": "basic-enhancement"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), Timeout)
	defer cancel()
	var enhanced string
	if h.OpenAIKey != "" {
		enhanced, err = h.withOpenAI(ctx, query)
	} else {
		enhanced, err = h.withAnthropic(ctx, query)
	}
	if err != nil || jscompat.Trim(enhanced) == "" {
		if err != nil {
			h.log("provider", err)
		}
		write(w, 200, map[string]any{"enhancedQuery": enhanceBasic(query), "source": "basic-enhancement"})
		return
	}
	write(w, 200, map[string]any{"enhancedQuery": enhanced, "source": "ai-powered"})
}

// The five word lists, in the order their additions appear in the reply.
// Matching uses whole Unicode words in the trimmed, lower-cased query.
var wordLists = []struct {
	words    []string
	addition string
}{
	{[]string{"web", "website", "site"}, "web application"},
	{[]string{"app", "application"}, "application"},
	{[]string{"api", "rest", "graphql"}, "API"},
	{[]string{"dashboard", "admin", "panel"}, "dashboard"},
	{[]string{"mobile", "android", "ios"}, "mobile"},
}

// enhanceBasic adds fixed words to a query without asking anyone. A query
// that uses operators or quotation marks is only trimmed.
func enhanceBasic(query string) string {
	trimmed := jscompat.Trim(query)
	if strings.Contains(trimmed, ":") || strings.Contains(trimmed, `"`) {
		return trimmed
	}
	words := strings.FieldsFunc(jscompat.ToLowerCase(trimmed), func(r rune) bool {
		return !(unicode.IsLetter(r) || unicode.IsNumber(r) || unicode.IsMark(r) || r == '_')
	})
	original, seen := map[string]bool{}, map[string]bool{}
	for _, word := range words {
		original[word] = true
		seen[word] = true
	}
	additions := []string{}
	for _, list := range wordLists {
		matches := false
		for _, word := range list.words {
			if original[word] {
				matches = true
				break
			}
		}
		if !matches {
			continue
		}
		for _, word := range strings.Fields(list.addition) {
			key := jscompat.ToLowerCase(word)
			if !seen[key] {
				additions = append(additions, word)
				seen[key] = true
			}
		}
	}
	if len(additions) == 0 {
		return trimmed
	}
	return trimmed + " " + strings.Join(additions, " ")
}

func (h *Handler) withOpenAI(ctx context.Context, query string) (string, error) {
	url := h.OpenAIURL
	if url == "" {
		url = DefaultOpenAIURL
	}
	model := h.OpenAIModel
	if model == "" {
		model = openAIModel
	}
	request := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": openAISystemPrompt},
			{"role": "user", "content": query},
		},
		"max_tokens":  100,
		"temperature": 0.7,
	}
	// A reasoning model can spend all 100 tokens thinking and answer null.
	if h.OpenAIReasoning != "" {
		request["reasoning_effort"] = h.OpenAIReasoning
	}
	data, err := h.post(ctx, url, map[string]string{"Authorization": "Bearer " + h.OpenAIKey}, request)
	if err != nil {
		return "", err
	}
	// data.choices[0].message.content.trim()
	choice, _ := aiprovider.First(aiprovider.Field(data, "choices"))
	content, isText := aiprovider.Field(aiprovider.Field(choice, "message"), "content").(string)
	if !isText {
		return "", errors.New("provider reply has no text")
	}
	return jscompat.Trim(content), nil
}

func (h *Handler) withAnthropic(ctx context.Context, query string) (string, error) {
	url := h.AnthropicURL
	if url == "" {
		url = DefaultAnthropicURL
	}
	quoted, _ := jscompat.ToUTF16(query).MarshalJSON()
	escaped := string(quoted[1 : len(quoted)-1])
	data, err := h.post(ctx, url, map[string]string{"x-api-key": h.AnthropicKey, "anthropic-version": "2023-06-01"}, map[string]any{
		"model":      anthropicModel,
		"max_tokens": 100,
		"messages": []map[string]string{
			// Keep user text JSON-escaped inside the quoted prompt boundary.
			{"role": "user", "content": anthropicPromptBefore + escaped + anthropicPromptAfter},
		},
	})
	if err != nil {
		return "", err
	}
	// data.content[0].text.trim()
	block, _ := aiprovider.First(aiprovider.Field(data, "content"))
	text, isText := aiprovider.Field(block, "text").(string)
	if !isText {
		return "", errors.New("provider reply has no text")
	}
	return jscompat.Trim(text), nil
}

// post sends one JSON request to a provider and returns its decoded reply.
// An error status is an error even when the body looks like a normal reply.
func (h *Handler) post(ctx context.Context, url string, headers map[string]string, payload any) (any, error) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(encoded))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	for name, value := range headers {
		req.Header.Set(name, value)
	}
	client := h.Client
	if client == nil {
		client = http.DefaultClient
	}
	// Constrain both bearer and x-api-key credentials to this endpoint.
	confined := *client
	confined.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := confined.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxReplyBytes+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxReplyBytes {
		return nil, errors.New("provider reply too large")
	}
	data, err := jscompat.DecodeJSON(body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		// Only the status is kept; the provider's own text is not repeated.
		return nil, fmt.Errorf("provider answered %d", resp.StatusCode)
	}
	return data, nil
}

// fail answers the one fixed sentence the contract allows and tells the
// operator why. The cause never goes to the caller.
func (h *Handler) fail(w http.ResponseWriter, stage string, err error) {
	h.log(stage, err)
	write(w, 500, map[string]any{"error": "Failed to enhance query"})
}

func (h *Handler) log(stage string, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	logger.Error("ai enhance-query request failed", "stage", stage, "error", err)
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
