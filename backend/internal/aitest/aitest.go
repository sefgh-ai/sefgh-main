// Package aitest holds what the AI contract tests share. It is imported only
// by tests. It mirrors scripts/contracts/ai-fixture-common.mjs, so a fixture
// means the same thing to the Node runner and to the Go one.
package aitest

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/ailimit"
)

// Now is the fixed moment of every AI fixture, so an allowance and its
// Retry-After do not depend on when the test runs.
var Now = time.Date(2026, 10, 13, 12, 0, 0, 0, time.UTC)

// Expand turns every {"$repeat": ["ab", 4000]} in a decoded JSON value into
// the string it stands for. Fixtures write long text that way.
func Expand(value any) any {
	switch v := value.(type) {
	case []any:
		out := make([]any, len(v))
		for i, element := range v {
			out[i] = Expand(element)
		}
		return out
	case map[string]any:
		if repeat, isList := v["$repeat"].([]any); isList && len(v) == 1 && len(repeat) == 2 {
			unit, _ := repeat[0].(string)
			times, _ := repeat[1].(float64)
			return strings.Repeat(unit, int(times))
		}
		out := make(map[string]any, len(v))
		for key, element := range v {
			out[key] = Expand(element)
		}
		return out
	}
	return value
}

// Decode reads JSON into plain Go values and expands it. Both sides of a
// comparison go through it, so numbers and key order cannot differ by form.
func Decode(raw []byte) (any, error) {
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	return Expand(value), nil
}

// Plain converts any value to the same plain form by encoding and decoding it.
func Plain(value any) any {
	raw, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	plain, err := Decode(raw)
	if err != nil {
		panic(err)
	}
	return plain
}

// Earlier describes requests a caller made before the fixture's own.
type Earlier struct {
	Requests   int    `json:"earlier_requests"`
	AgeSeconds int    `json:"earlier_age_seconds"`
	Key        string `json:"earlier_key"`
}

// Limiter returns a new limiter in the state a fixture describes. key is the
// fixture's own caller, used unless the fixture names another.
func (e Earlier) Limiter(key string) *ailimit.Limiter {
	limiter := ailimit.New(ailimit.Requests, ailimit.Window)
	if e.Key != "" {
		key = e.Key
	}
	when := Now.Add(-time.Duration(e.AgeSeconds) * time.Second)
	for i := 0; i < e.Requests; i++ {
		limiter.Take(key, when)
	}
	return limiter
}
