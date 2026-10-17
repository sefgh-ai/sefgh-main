package jscompat

import (
	"encoding/json"
	"strconv"
	"time"
)

// Truthy reports whether JavaScript would treat a value ParseJSON returned
// as true: everything but null, false, 0 and empty text.
func Truthy(value any) bool {
	switch v := value.(type) {
	case nil:
		return false
	case bool:
		return v
	case string:
		return v != ""
	case json.Number:
		// A JSON number is never NaN. One too small for a double is 0 in
		// both languages, and one too large is Infinity, which is truthy.
		f, _ := strconv.ParseFloat(string(v), 64)
		return f != 0
	}
	return true
}

// TruthyJSON is Truthy for one raw JSON value. A field that is not there
// (nil) is undefined in JavaScript, which is false.
func TruthyJSON(raw json.RawMessage) bool {
	if raw == nil {
		return false
	}
	value, _ := ParseJSON(string(raw))
	return Truthy(value)
}

// RequestFields reads a request body as a Next.js handler's
// `const { a, b } = await request.json()` does. It returns each field of an
// object as its raw JSON, with the last value of a repeated name, as
// JSON.parse keeps it. A list, text, a number or a boolean has no such
// fields. ok is false where the handler throws: a body that is not JSON
// (request.json() rejects) or is null (null cannot be destructured).
func RequestFields(body []byte) (fields map[string]json.RawMessage, ok bool) {
	value, err := DecodeJSON(body)
	if err != nil || value == nil {
		return nil, false
	}
	fields = map[string]json.RawMessage{}
	if _, isObject := value.(map[string]any); isObject {
		list, _ := ObjectFields([]byte(DecodeUTF8(body)))
		for _, field := range list {
			fields[field.Name] = field.Value
		}
	}
	return fields, true
}

// ISOString writes a moment as JavaScript's Date.prototype.toISOString
// does: in UTC, with milliseconds, such as 2026-10-17T09:30:00.000Z. A year
// outside 0 to 9999 is written with a sign and six digits, as JavaScript
// writes it.
func ISOString(t time.Time) string {
	t = t.UTC().Truncate(time.Millisecond)
	year := t.Year()
	if year >= 0 && year <= 9999 {
		return t.Format("2006-01-02T15:04:05.000Z")
	}
	sign := "+"
	if year < 0 {
		sign, year = "-", -year
	}
	digits := strconv.Itoa(year)
	for len(digits) < 6 {
		digits = "0" + digits
	}
	return sign + digits + t.Format("-01-02T15:04:05.000Z")
}

// LengthOrZero is `value?.length || 0` for a value ParseJSON returned, with
// raw its JSON text, written back as JSON: a list's length, text's length in
// UTF-16 units, or an object's own length field when it is truthy, as it was
// written. Anything else has no length, so it is 0.
func LengthOrZero(value any, raw []byte) json.RawMessage {
	switch v := value.(type) {
	case []any:
		return json.RawMessage(strconv.Itoa(len(v)))
	case string:
		return json.RawMessage(strconv.Itoa(UTF16Len(v)))
	case map[string]any:
		fields, _ := ObjectFields([]byte(DecodeUTF8(raw)))
		var length json.RawMessage
		for _, field := range fields {
			if field.Name == "length" {
				length = field.Value
			}
		}
		if TruthyJSON(length) {
			return length
		}
	}
	return json.RawMessage("0")
}

// FieldOr is `data?.name || fallback` for one reply's JSON text: the field
// as written when the reply is an object and the field is truthy, and
// fallback otherwise. A list, text or nothing has no field.
func FieldOr(raw []byte, name string, fallback []byte) []byte {
	fields, ok := ObjectFields([]byte(DecodeUTF8(raw)))
	if !ok {
		return fallback
	}
	var value json.RawMessage
	for _, f := range fields {
		if f.Name == name {
			value = f.Value
		}
	}
	if TruthyJSON(value) {
		return value
	}
	return fallback
}
