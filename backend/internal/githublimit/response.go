// Package githublimit shares the search API's rate-limit response policy
// across the public trending searches.
package githublimit

import (
	"encoding/json"
	"net/http"
	"strings"
)

// Write answers a GitHub 429, or a rate-related 403, and reports whether it
// wrote a response. Other statuses are left to the caller. Upstream bodies
// are never exposed; absent metadata becomes JSON null, as in search.
func Write(w http.ResponseWriter, status int, headers http.Header) bool {
	if status != http.StatusTooManyRequests &&
		(status != http.StatusForbidden || (headers.Get("Retry-After") == "" && headers.Get("X-Ratelimit-Remaining") != "0")) {
		return false
	}
	value := func(name string) *string {
		values := headers.Values(name)
		if len(values) == 0 {
			return nil
		}
		joined := strings.Join(values, ", ")
		return &joined
	}
	if retry := headers.Get("Retry-After"); retry != "" {
		w.Header().Set("Retry-After", retry)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusTooManyRequests)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error":      "GitHub rate limit reached, please try again shortly",
		"rate_limit": map[string]*string{"remaining": value("X-Ratelimit-Remaining"), "reset": value("X-Ratelimit-Reset")},
	})
	return true
}
