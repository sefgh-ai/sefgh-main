// Package aitest holds what the AI contract tests share. It is imported only
// by tests. It mirrors scripts/contracts/ai-fixture-common.mjs, so a fixture
// means the same thing to the Node runner and to the Go one.
package aitest

import (
	"encoding/json"
	"strconv"
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
	if err := json.Unmarshal(keepLoneHalves(raw), &value); err != nil {
		return nil, err
	}
	return Expand(value), nil
}

// keepLoneHalves rewrites each escape of half a surrogate pair that has no
// partner, such as \ud83d, as the six characters it is written with.
// json.Unmarshal would turn it into U+FFFD on both sides of a comparison
// alike, and a reply that wrote U+FFFD where JavaScript writes \ud83d would
// then pass. An escaped pair, and every other escape, is left as it is.
func keepLoneHalves(raw []byte) []byte {
	out := make([]byte, 0, len(raw))
	inString := false
	for i := 0; i < len(raw); i++ {
		c := raw[i]
		switch {
		case !inString:
			inString = c == '"'
		case c == '"':
			inString = false
		case c == '\\' && i+1 < len(raw):
			if unit, ok := escapedUnit(raw, i); ok && unit >= 0xD800 && unit <= 0xDFFF {
				if low, ok := escapedUnit(raw, i+6); ok && unit <= 0xDBFF && low >= 0xDC00 && low <= 0xDFFF {
					out = append(out, raw[i:i+12]...)
					i += 11
					continue
				}
				out = append(out, '\\')
			}
			// The escaped character is copied with its backslash, so an
			// escaped quotation mark does not end the string.
			out = append(out, c, raw[i+1])
			i++
			continue
		}
		out = append(out, c)
	}
	return out
}

// escapedUnit reads the \uXXXX escape at raw[i], if there is one.
func escapedUnit(raw []byte, i int) (rune, bool) {
	if i+6 > len(raw) || raw[i] != '\\' || raw[i+1] != 'u' {
		return 0, false
	}
	unit, err := strconv.ParseUint(string(raw[i+2:i+6]), 16, 16)
	return rune(unit), err == nil
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
