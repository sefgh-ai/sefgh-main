package apikey

import (
	"bytes"
	"encoding/json"
	"io"
)

// JSON structs accept case aliases by default. Compare object shapes with the
// canonical re-encoding too, and reject duplicate members before decoding. This
// also makes missing, unknown and wrongly cased RPC fields fail closed.
func strictRPCJSON(body []byte, out any) error {
	original, err := rpcJSONShape(body)
	if err != nil {
		return ErrUnavailable
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if decoder.Decode(out) != nil {
		return ErrUnavailable
	}
	canonical, err := json.Marshal(out)
	if err != nil {
		return ErrUnavailable
	}
	normalized, err := rpcJSONShape(canonical)
	if err != nil || !sameRPCShape(original, normalized) {
		return ErrUnavailable
	}
	return nil
}
func rpcJSONShape(body []byte) (any, error) {
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	value, err := rpcJSONValue(decoder, 0)
	if err != nil {
		return nil, err
	}
	if _, err := decoder.Token(); err != io.EOF {
		return nil, ErrUnavailable
	}
	return value, nil
}
func rpcJSONValue(d *json.Decoder, depth int) (any, error) {
	if depth > 16 {
		return nil, ErrUnavailable
	}
	token, err := d.Token()
	if err != nil {
		return nil, err
	}
	delim, ok := token.(json.Delim)
	if !ok {
		return token, nil
	}
	switch delim {
	case '{':
		result := map[string]any{}
		for d.More() {
			name, err := d.Token()
			if err != nil {
				return nil, err
			}
			key, ok := name.(string)
			if !ok {
				return nil, ErrUnavailable
			}
			if _, exists := result[key]; exists {
				return nil, ErrUnavailable
			}
			value, err := rpcJSONValue(d, depth+1)
			if err != nil {
				return nil, err
			}
			result[key] = value
		}
		if end, err := d.Token(); err != nil || end != json.Delim('}') {
			return nil, ErrUnavailable
		}
		return result, nil
	case '[':
		result := []any{}
		for d.More() {
			value, err := rpcJSONValue(d, depth+1)
			if err != nil {
				return nil, err
			}
			result = append(result, value)
		}
		if end, err := d.Token(); err != nil || end != json.Delim(']') {
			return nil, ErrUnavailable
		}
		return result, nil
	}
	return nil, ErrUnavailable
}
func sameRPCShape(a, b any) bool {
	switch x := a.(type) {
	case map[string]any:
		y, ok := b.(map[string]any)
		if !ok || len(x) != len(y) {
			return false
		}
		for k, v := range x {
			w, exists := y[k]
			if !exists || !sameRPCShape(v, w) {
				return false
			}
		}
		return true
	case []any:
		y, ok := b.([]any)
		if !ok || len(x) != len(y) {
			return false
		}
		for i, v := range x {
			if !sameRPCShape(v, y[i]) {
				return false
			}
		}
		return true
	case nil:
		return b == nil
	case string:
		_, ok := b.(string)
		return ok
	case bool:
		_, ok := b.(bool)
		return ok
	case json.Number:
		_, ok := b.(json.Number)
		return ok
	}
	return false
}
