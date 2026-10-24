package reposync

import (
	"errors"
	"fmt"
	"math"
	"net/http"
	"time"
)

const (
	initialBackoff    = 60
	maxBackoff        = 3600
	backoffMultiplier = 2
)

// ErrResetWaitCrash reproduces the original's crash (R-190): with every key
// exhausted, handle_rate_limit subtracts a naive UTC time from a time-zone
// aware reset time, Python raises TypeError and the worker stops with the
// topic left in_progress. Kept so the two can be compared; fixed in Go after
// cutover.
var ErrResetWaitCrash = errors.New("TypeError: can't subtract offset-naive and offset-aware datetimes")

// keyRing is RateLimitManager: GitHub keys used in turn, with rotation and
// backoff.
type keyRing struct {
	keys    []string
	current int
	backoff int
	info    []*keyInfo
}

func newKeyRing(keys, names []string) *keyRing {
	r := &keyRing{keys: keys, backoff: initialBackoff}
	for i, key := range keys {
		name := fmt.Sprintf("key%d", i+1)
		if i < len(names) {
			name = names[i]
		} else if len([]rune(key)) >= 6 {
			name = edges(key, 3)
		}
		r.info = append(r.info, &keyInfo{Index: i, Name: name, MaskedKey: mask(key)})
	}
	return r
}

// edges is key[:n] + '...' + key[-n:], counted in characters as Python does.
func edges(key string, n int) string {
	r := []rune(key)
	return string(r[:n]) + "..." + string(r[len(r)-n:])
}

func mask(key string) string {
	switch n := len([]rune(key)); {
	case n >= 7:
		return edges(key, 3)
	case n >= 4:
		return edges(key, 2)
	}
	return "***"
}

func (w *Worker) publishKeys() {
	exhausted := 0
	for _, k := range w.keys.info {
		if k.IsExhausted {
			exhausted++
		}
	}
	w.state.keys = keysState{TotalKeys: len(w.keys.keys), CurrentKeyIndex: w.keys.current, ExhaustedKeys: exhausted, KeysInfo: w.keys.info}
}

// currentKey is get_current_key. Its first step, _reset_expired_keys, never
// clears anything in the original: comparing a naive now with an aware reset
// time raises TypeError, which it swallows. So an exhausted key only recovers
// when a later reply reports more points left.
func (w *Worker) currentKey() string {
	r := w.keys
	if !r.info[r.current].IsExhausted {
		return r.keys[r.current]
	}
	start := r.current
	for range r.keys {
		r.current = (r.current + 1) % len(r.keys)
		if !r.info[r.current].IsExhausted {
			if r.current != start {
				w.publishKeys()
			}
			return r.keys[r.current]
		}
	}
	return r.keys[r.current]
}

// earliestReset is all_keys_exhausted: false while any key has points left.
func (w *Worker) earliestReset() bool {
	for _, k := range w.keys.info {
		if !k.IsExhausted {
			return false
		}
	}
	for _, k := range w.keys.info {
		if s, ok := k.ResetAt.(string); ok {
			if _, err := time.Parse(time.RFC3339, s); err == nil {
				return true
			}
		}
	}
	return false
}

// handleRateLimit is handle_rate_limit after an HTTP 403.
func (w *Worker) handleRateLimit() error {
	r := w.keys
	w.state.status = "rate_limited"
	w.state.backoffs++
	cur := r.info[r.current]
	cur.IsExhausted = true
	w.logErrorEvent("rate_limit_backoff", cur.Name, fmt.Sprintf("Rate limit hit on Key %d", r.current+1), 0, r.backoff)

	if w.earliestReset() {
		return ErrResetWaitCrash
	}
	// Other keys are left: back off one second at a time, then rotate. The
	// rotation resets the backoff just doubled, so it never grows (R-189).
	for i := r.backoff; i > 0; i-- {
		if w.stopped() {
			break
		}
		w.cfg.Sleep(time.Second)
	}
	r.backoff = min(r.backoff*backoffMultiplier, maxBackoff)
	r.current = (r.current + 1) % len(r.keys)
	r.backoff = initialBackoff
	w.publishKeys()
	return nil
}

// updateFromHeaders is update_from_headers.
func (w *Worker) updateFromHeaders(h http.Header) {
	remaining, reset, limit := h.Get("X-RateLimit-Remaining"), h.Get("X-RateLimit-Reset"), h.Get("X-RateLimit-Limit")
	now := w.cfg.Now().UTC()
	var resetAt, resetIn any
	if seconds, ok := pyInt(reset); reset != "" && ok {
		at := time.Unix(seconds, 0).UTC()
		resetAt = isoformat(at) + "Z"
		resetIn = int64(math.Max(0, math.Trunc(at.Sub(now).Seconds())))
	}
	asInt := func(s string) any {
		if i, ok := pyInt(s); ok {
			return i
		}
		return nil
	}
	if remaining != "" || limit != "" || resetAt != nil {
		w.state.rateLimit = rateLimit{Remaining: asInt(remaining), Limit: asInt(limit), ResetAt: resetAt, ResetInSeconds: resetIn}
	}
	cur := w.keys.info[w.keys.current]
	if remaining != "" {
		n, _ := pyInt(remaining)
		cur.Remaining = n
		cur.IsExhausted = n < 5
	}
	if limit != "" {
		cur.Limit = asInt(limit)
	}
	if resetAt != nil {
		cur.ResetAt = resetAt
		cur.ResetInSeconds = resetIn
	}
	w.publishKeys()
}

// updateFromBody is update_from_body_rate_limit. Its reset_in_seconds is
// always null: the original's subtraction mixes aware and naive times and
// the TypeError is swallowed. The queries never ask for cost, so it is 0
// (R-192).
func (w *Worker) updateFromBody(body any) {
	if !truthy(body) {
		return
	}
	remaining, limit, resetAt := get(body, "remaining", nil), get(body, "limit", nil), get(body, "resetAt", nil)
	cost, _ := pyInt(get(body, "cost", nil))
	w.state.rateLimit = rateLimit{Remaining: remaining, Limit: limit, ResetAt: resetAt, ResetInSeconds: nil}

	cur := w.keys.info[w.keys.current]
	cur.Remaining, cur.Limit, cur.ResetAt, cur.ResetInSeconds = remaining, limit, resetAt, nil
	n, isNumber := pyInt(remaining)
	cur.IsExhausted = remaining != nil && isNumber && n < 5
	cur.TotalRequests++
	cur.TotalCostPoints += int(cost)
	cur.LastUsedAt = isoformat(w.cfg.Now().UTC()) + "Z"

	s := &w.state.stats
	s.TotalRequests++
	s.TotalCostPoints += int(cost)
	s.EstimatedCostUSD = math.Round(float64(s.TotalCostPoints)*w.cfg.CostPerPoint*1e6) / 1e6
	use := s.PerKey[cur.Name]
	use.Requests++
	use.CostPoints += int(cost)
	s.PerKey[cur.Name] = use
	w.publishKeys()
}
