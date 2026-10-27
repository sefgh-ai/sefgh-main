//go:build solution

package lesson47

import (
	"bytes"
	"encoding/json"
)

func isPublic(text []byte) bool {
	// A map keeps the last value of a repeated name, as JSON.parse does.
	// null decodes to an empty map without an error, and has no "private".
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(text, &fields); err != nil {
		return false
	}
	return bytes.Equal(bytes.TrimSpace(fields["private"]), []byte("false"))
}
