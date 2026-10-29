// Package githubsearch serves GET /api/github/search, a thin proxy in front
// of GitHub's repository search.
//
// Its behaviour is fixed by contracts/github-search/cases.json. The Next.js
// rollback handler in src/app/api/github/search/route.js is characterized
// separately through next_expect fields when an approved Go fix differs.
package githubsearch

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

const (
	// DefaultBaseURL is GitHub's REST API origin.
	DefaultBaseURL = "https://api.github.com"

	// DefaultTimeout bounds the whole upstream call, including reading the
	// body. The Next.js handler sets no timeout; this difference is deliberate
	// and recorded in docs/adr/0002-go-backend.md.
	DefaultTimeout = 10 * time.Second

	// maxBodyBytes bounds how much of GitHub's reply is read. A full page of
	// 100 results is well under 2 MB.
	maxBodyBytes = 16 << 20
)

// Messages the caller sees. The search page shows them to users in a toast.
const (
	msgFailed      = "Failed to search repositories"
	msgRateLimited = "GitHub rate limit reached, please try again shortly"
	msgRejected    = "GitHub could not process this search"
)

// defaultClient is used when Handler.Client is nil. http.DefaultClient has
// no timeout at all, so it is deliberately not used.
var defaultClient = &http.Client{Timeout: DefaultTimeout}

// Handler serves GET /api/github/search. The zero value is ready to use.
type Handler struct {
	// Client sends requests to GitHub. Nil means a client with DefaultTimeout.
	Client *http.Client
	// BaseURL is the GitHub API origin, without a trailing slash.
	// Empty means DefaultBaseURL.
	BaseURL string
	// Token is the verified caller's GitHub token; empty means public access.
	Token string
	// Logger records failures. Nil means slog.Default().
	Logger *slog.Logger
	// Now supplies the clock for monthly/yearly windows; nil means time.Now.
	Now func() time.Time
}

// rateLimit reports GitHub's rate-limit headers. A nil field becomes JSON
// null, which the contract requires when the header is absent.
type rateLimit struct {
	Remaining *string `json:"remaining"`
	Reset     *string `json:"reset"`
}

type searchResponse struct {
	TotalCount json.RawMessage `json:"total_count"`
	Items      json.RawMessage `json:"items"`
	RateLimit  rateLimit       `json:"rate_limit"`
}

type errorResponse struct {
	Error     string     `json:"error"`
	RateLimit *rateLimit `json:"rate_limit,omitempty"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	search, err := parseRequest(r.URL.RawQuery, now())
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, search.upstreamURL(h.baseURL()), nil)
	if err != nil {
		h.fail(w, r, fmt.Errorf("building GitHub request: %w", err))
		return
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "SEFGH-NextJS-App")
	if h.Token != "" {
		req.Header.Set("Authorization", "Bearer "+h.Token)
	}

	resp, err := h.client().Do(req)
	if err != nil {
		h.fail(w, r, fmt.Errorf("calling GitHub: %w", err))
		return
	}
	defer resp.Body.Close()

	limit := rateLimit{
		Remaining: headerValue(resp.Header, "X-Ratelimit-Remaining"),
		Reset:     headerValue(resp.Header, "X-Ratelimit-Reset"),
	}

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		switch {
		case isRateLimited(resp):
			if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
				w.Header().Set("Retry-After", retryAfter)
			}
			writeJSON(w, http.StatusTooManyRequests, errorResponse{Error: msgRateLimited, RateLimit: &limit})
		case resp.StatusCode == http.StatusUnprocessableEntity:
			// GitHub rejected the search itself: a query it cannot parse,
			// or a page beyond its 1000-result cap.
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: msgRejected})
		default:
			h.fail(w, r, fmt.Errorf("GitHub answered %d", resp.StatusCode))
		}
		return
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		h.fail(w, r, fmt.Errorf("reading GitHub reply: %w", err))
		return
	}
	if len(body) > maxBodyBytes {
		h.fail(w, r, fmt.Errorf("GitHub reply exceeds %d bytes", maxBodyBytes))
		return
	}

	// A map keeps key matching exact. Decoding into a struct would also
	// accept "Total_Count", because encoding/json ignores case.
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(body, &fields); err != nil {
		h.fail(w, r, fmt.Errorf("decoding GitHub reply: %w", err))
		return
	}
	total, items := fields["total_count"], fields["items"]
	if !isJSONNumber(total) || !isJSONArray(items) {
		h.fail(w, r, fmt.Errorf("GitHub reply lacks total_count or items"))
		return
	}

	writeJSON(w, http.StatusOK, searchResponse{TotalCount: total, Items: items, RateLimit: limit})
}

// fail answers with the generic failure, as the Next.js handler's catch
// block does.
func (h *Handler) fail(w http.ResponseWriter, r *http.Request, err error) {
	if r.Context().Err() != nil {
		// The caller has gone away, so there is no one to answer.
		h.logger().Info("github search canceled", "error", err)
		return
	}
	h.logger().Error("github search failed", "error", err)
	writeJSON(w, http.StatusInternalServerError, errorResponse{Error: msgFailed})
}

// isRateLimited reports whether GitHub refused the request for exceeding a
// rate limit. A primary limit reports zero remaining requests and a secondary
// limit sends Retry-After. A 403 with neither is an ordinary failure.
func isRateLimited(resp *http.Response) bool {
	if resp.StatusCode == http.StatusTooManyRequests {
		return true
	}
	return resp.StatusCode == http.StatusForbidden &&
		(resp.Header.Get("Retry-After") != "" || resp.Header.Get("X-Ratelimit-Remaining") == "0")
}

// headerValue returns a header's value, or nil when it is absent. Repeated
// headers are joined with ", ", as JavaScript's Headers.get does.
func headerValue(h http.Header, name string) *string {
	values := h.Values(name)
	if len(values) == 0 {
		return nil
	}
	joined := strings.Join(values, ", ")
	return &joined
}

func isJSONNumber(raw json.RawMessage) bool {
	return len(raw) > 0 && (raw[0] == '-' || '0' <= raw[0] && raw[0] <= '9')
}

func isJSONArray(raw json.RawMessage) bool {
	return len(raw) > 0 && raw[0] == '['
}

// writeJSON sends v as the JSON body. It sets no Cache-Control header,
// matching the Next.js handler.
func writeJSON(w http.ResponseWriter, status int, v any) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false) // keep <, > and & as GitHub sent them
	if err := enc.Encode(v); err != nil {
		status = http.StatusInternalServerError
		buf.Reset()
		buf.WriteString(`{"error":"` + msgFailed + `"}`)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(bytes.TrimSuffix(buf.Bytes(), []byte("\n")))
}

func (h *Handler) client() *http.Client {
	if h.Client != nil {
		return h.Client
	}
	return defaultClient
}

func (h *Handler) baseURL() string {
	if h.BaseURL != "" {
		return strings.TrimSuffix(h.BaseURL, "/")
	}
	return DefaultBaseURL
}

func (h *Handler) logger() *slog.Logger {
	if h.Logger != nil {
		return h.Logger
	}
	return slog.Default()
}
