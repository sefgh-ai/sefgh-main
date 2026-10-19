// Package aichat ports POST /api/ai/chat at contract version 2. Every case in
// contracts/ai-chat is answered as the Next.js handler answers it, including
// the cases still marked defect.
//
// The one planned difference: Next.js also accepts its own session cookie
// when no bearer is sent. Go cannot read that cookie and accepts the bearer
// only, so the browser sends one (src/lib/ai/chat-request.js).
package aichat

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/ailimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// The browser sends the whole conversation with every request, so a long
// chat makes a large body even though at most 8,000 characters of it are
// forwarded. This stays below the 4.5 MB a Vercel function accepts, which is
// the limit the Next.js handler meets in practice.
const maxRequestBytes = 4 << 20

// Handler answers chat and title requests. SignIn, Models and Limiter are
// required; Now and Logger have defaults.
type Handler struct {
	// SignIn says who is calling: the user's id with 200, or 401 or 503. In
	// the server it is githubaccess.Verifier.SignedInUser.
	SignIn func(*http.Request) (string, int)
	// Models is the GitHub Models client. Its token pays for every call.
	Models *aiprovider.Client
	// Limiter holds the allowance, counted per user id.
	Limiter *ailimit.Limiter
	Now     func() time.Time
	Logger  *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	r, cancel := ailimit.BoundRequest(w, r)
	defer cancel()
	// Order matters and is pinned by the contract: sign-in, then the
	// allowance, then the body. A refused request never reaches the provider,
	// and a request refused for its allowance is not counted.
	userID, status := h.SignIn(r)
	if status != 200 {
		message := "Sign-in could not be verified"
		if status == 401 {
			message = "Sign in to use chat"
		}
		write(w, status, map[string]any{"error": message})
		return
	}
	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	if wait := h.Limiter.Take(userID, now()); wait > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(wait))
		write(w, 429, map[string]any{"error": "Too many requests, please try again shortly"})
		return
	}

	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxRequestBytes))
	if err != nil {
		h.fail(w, "read_body", err)
		return
	}
	body, err := jscompat.DecodeJSON(raw)
	if err != nil {
		h.fail(w, "decode_body", err)
		return
	}
	// A body that is not an object has no messages and no action.
	object, _ := body.(map[string]any)
	messages, problem := prepareMessages(object["messages"])
	if problem != "" {
		write(w, 400, map[string]any{"error": problem})
		return
	}
	if action, _ := object["action"].(string); action == "generate_title" {
		h.title(w, r, messages)
		return
	}

	content, err := h.Models.Generate(r.Context(), messages, aiprovider.Options{})
	if err != nil {
		h.fail(w, "ai_call", err)
		return
	}
	if content == aiprovider.Undefined {
		// { response: undefined } in JavaScript, which JSON writes as {}.
		write(w, 200, map[string]any{})
		return
	}
	// Recorded defect: the content is passed on whatever its type.
	write(w, 200, map[string]any{"response": content})
}

// title answers a title request for the first user message among the
// messages that were kept. If the AI gives no usable title, a fallback made
// from the message's first words is used, so this never fails.
func (h *Handler) title(w http.ResponseWriter, r *http.Request, messages []aiprovider.Message) {
	var first *aiprovider.Message
	for i := range messages {
		if messages[i].Role == "user" {
			first = &messages[i]
			break
		}
	}
	if first == nil {
		write(w, 400, map[string]any{"error": "No user message found"})
		return
	}
	content, err := h.Models.Generate(r.Context(), aiprovider.TitleMessages(first.Content), aiprovider.TitleOptions)
	if err != nil {
		h.log("title_call", err)
		write(w, 200, map[string]any{"title": fallbackTitle(first.Content)})
		return
	}
	title, isText := content.(string)
	if !isText {
		h.log("title_reply", errors.New("title is not text"))
		write(w, 200, map[string]any{"title": fallbackTitle(first.Content)})
		return
	}
	write(w, 200, map[string]any{"title": cleanTitle(title)})
}

func (h *Handler) log(stage string, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	logger.Error("ai chat request failed", "stage", stage, "error", err)
}

// fail answers the one fixed sentence the contract allows and tells the
// operator why. The cause never goes to the caller, and the messages never
// go to the log.
func (h *Handler) fail(w http.ResponseWriter, stage string, err error) {
	h.log(stage, err)
	write(w, 500, map[string]any{"error": "Failed to generate AI response"})
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
