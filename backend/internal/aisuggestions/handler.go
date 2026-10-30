// Package aisuggestions ports POST /api/ai/suggestions at contract version 2.
// Every case in contracts/ai-suggestions is answered as the Next.js handler
// answers it, including the cases still marked defect.
package aisuggestions

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/ailimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// A request body is small: one query. Anything larger is refused before it
// is read into memory. The Next.js handler leaves that to its platform.
const maxRequestBytes = 1 << 20

var (
	codeFenceWithJSON = regexp.MustCompile("```json\n?")
	codeFence         = regexp.MustCompile("```\n?")
)

// Handler answers suggestion requests. Generate is the AI call; in the
// server it is the GitHub Models client, in tests a stand-in.
type Handler struct {
	Generate func(ctx context.Context, messages []aiprovider.Message) (any, error)
	Limiter  *ailimit.Limiter
	Now      func() time.Time
	Logger   *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	r, cancel := ailimit.BoundRequest(w, r)
	defer cancel()
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
	// A body that is not an object has no query, so it is answered like an
	// empty one.
	object, _ := decoded.(map[string]any)
	value, present := object["query"]
	if !present {
		write(w, 200, map[string]any{"suggestions": []any{}})
		return
	}
	query, isText := value.(string)
	if !isText {
		write(w, 400, map[string]any{"error": "Query must be text"})
		return
	}
	query = jscompat.Trim(query)
	if jscompat.UTF16Len(jscompat.Trim(query)) < 2 {
		write(w, 200, map[string]any{"suggestions": []any{}})
		return
	}
	if jscompat.UTF16Len(query) > ailimit.QueryCharacters {
		write(w, 400, map[string]any{"error": "Query is too long"})
		return
	}

	lowerQuery := jscompat.Trim(jscompat.ToLowerCase(query))
	matches := []any{}
	for _, term := range popularSearches {
		if strings.Contains(term, lowerQuery) {
			matches = append(matches, term)
			if len(matches) == 3 {
				break
			}
		}
	}
	// The query was trimmed before every length check and provider prompt.
	if len(matches) >= 3 || jscompat.UTF16Len(query) < 5 {
		write(w, 200, map[string]any{"suggestions": matches, "source": "predefined"})
		return
	}
	fallback := map[string]any{"suggestions": matches, "source": "predefined-fallback"}

	// AI calls have an allowance per address. Past it, the built-in list
	// still answers, so the search box keeps working.
	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	if h.Limiter != nil && h.Limiter.Take(ailimit.ClientAddress(r), now()) > 0 {
		write(w, 200, fallback)
		return
	}

	content, err := h.Generate(r.Context(), []aiprovider.Message{
		{Role: "system", Content: "You are a helpful GitHub search assistant that completes user queries."},
		{Role: "user", Content: promptBefore + query + promptAfter},
	})
	if err != nil {
		h.log("ai_call", err)
		write(w, 200, fallback)
		return
	}
	suggestions, ok := parseSuggestions(content)
	if !ok {
		h.log("ai_reply", errors.New("reply is not a JSON list"))
		write(w, 200, fallback)
		return
	}

	// AI suggestions first, then the built-in matches the AI did not give.
	combined := []any{}
	seen := map[string]bool{}
	for _, item := range suggestions {
		text, ok := item.(string)
		if !ok {
			continue
		}
		text = jscompat.Trim(text)
		if text == "" || seen[text] {
			continue
		}
		seen[text] = true
		combined = append(combined, text)
		if len(combined) == 3 {
			break
		}
	}
	for _, match := range matches {
		text := match.(string)
		if !seen[text] {
			combined = append(combined, text)
			seen[text] = true
		}
	}
	if len(combined) > 5 {
		combined = combined[:5]
	}
	write(w, 200, map[string]any{"suggestions": combined, "source": "ai-powered"})
}

const (
	promptBefore = "You are a GitHub search assistant. The user is typing: \""
	promptAfter  = "\"\n\nGenerate 3-5 relevant search query completions that would help them find repositories on GitHub. Focus on:\n" +
		"- Completing their thought/sentence\n" +
		"- Adding relevant technologies or keywords\n" +
		"- Suggesting popular search patterns\n" +
		"- Making queries more specific and useful\n\n" +
		"Return ONLY a JSON array of suggestion strings, nothing else. Example format:\n" +
		"[\"suggestion 1\", \"suggestion 2\", \"suggestion 3\"]\n\n" +
		"Suggestions:"
)

// parseSuggestions reads the AI's reply as the Next.js handler does: strip
// Markdown code fences, trim, parse as JSON, and accept only a list.
func parseSuggestions(content any) ([]any, bool) {
	text, isText := content.(string)
	if !isText {
		return nil, false
	}
	text = codeFence.ReplaceAllString(codeFenceWithJSON.ReplaceAllString(text, ""), "")
	parsed, err := jscompat.ParseJSON(jscompat.Trim(text))
	if err != nil {
		return nil, false
	}
	list, isList := parsed.([]any)
	return list, isList
}

// contains is Array.prototype.includes for a text value: only an element
// that is the same text counts. The elements can be any JSON value, and Go
// cannot compare a list or an object with ==, so each is checked for being
// text first.
func contains(list []any, text any) bool {
	want, _ := text.(string)
	for _, element := range list {
		if got, isText := element.(string); isText && got == want {
			return true
		}
	}
	return false
}

// truthy reports whether JavaScript would treat a decoded JSON value as true.
func truthy(value any) bool {
	switch v := value.(type) {
	case nil:
		return false
	case bool:
		return v
	case string:
		return v != ""
	case json.Number:
		f, err := v.Float64()
		return err != nil || f != 0
	default:
		return true
	}
}

func (h *Handler) log(stage string, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	logger.Error("ai suggestions request failed", "stage", stage, "error", err)
}

// fail answers the one fixed sentence the contract allows and tells the
// operator why. The cause never goes to the caller.
func (h *Handler) fail(w http.ResponseWriter, stage string, err error) {
	h.log(stage, err)
	write(w, 500, map[string]any{"error": "Failed to generate suggestions"})
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
