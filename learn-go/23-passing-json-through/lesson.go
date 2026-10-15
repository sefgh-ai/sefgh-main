// Package lesson23 picks fields out of a JSON object without decoding their
// values, as summary does in backend/internal/starred/github.go.
package lesson23

import "encoding/json"

// Field is one name of a JSON object with its value, exactly as written. It
// is the same shape as jscompat.Field in the backend.
type Field struct {
	Name  string
	Value json.RawMessage
}
