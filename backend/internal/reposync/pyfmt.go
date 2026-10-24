package reposync

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// isoformat writes t as Python's datetime.isoformat() does for a naive
// datetime: no zone, and microseconds only when there are any.
func isoformat(t time.Time) string {
	s := t.Format("2006-01-02T15:04:05")
	if us := t.Nanosecond() / 1000; us != 0 {
		s += fmt.Sprintf(".%06d", us)
	}
	return s
}

// truthy is Python's bool() for a decoded JSON value.
func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case json.Number:
		f, err := x.Float64()
		return err != nil || f != 0
	case string:
		return x != ""
	case map[string]any:
		return len(x) > 0
	case []any:
		return len(x) > 0
	}
	return true
}

// get is Python's dict.get(key, default): the default only when the key is
// missing, nil when it is present as null. A value that is not an object has
// no keys, which is where Python would raise instead.
func get(v any, key string, def any) any {
	m, ok := v.(map[string]any)
	if !ok {
		return def
	}
	if x, present := m[key]; present {
		return x
	}
	return def
}

// pyInt is Python's int() of a JSON number or numeric string.
func pyInt(v any) (int64, bool) {
	switch x := v.(type) {
	case json.Number:
		if i, err := x.Int64(); err == nil {
			return i, true
		}
		f, err := x.Float64()
		return int64(f), err == nil
	case string:
		i, err := strconv.ParseInt(strings.TrimSpace(x), 10, 64)
		return i, err == nil
	}
	return 0, false
}

// pyStr is Python's str() of a filter value, as postgrest-py formats it.
func pyStr(v any) string {
	if v == nil {
		return "None"
	}
	if n, ok := v.(json.Number); ok {
		return n.String()
	}
	return fmt.Sprint(v)
}

// pyRepr writes raw JSON as Python's str() of what json.loads returns, keeping
// the object key order GitHub sent. RepoSync stores GraphQL errors this way.
func pyRepr(raw []byte) string {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var b strings.Builder
	if err := reprValue(dec, &b); err != nil {
		return string(raw)
	}
	return b.String()
}

func reprValue(dec *json.Decoder, b *strings.Builder) error {
	tok, err := dec.Token()
	if err != nil {
		return err
	}
	switch t := tok.(type) {
	case json.Delim:
		closing := map[json.Delim]string{'{': "}", '[': "]"}[t]
		b.WriteString(string(t))
		for i := 0; dec.More(); i++ {
			if i > 0 {
				b.WriteString(", ")
			}
			if t == '{' {
				key, err := dec.Token()
				if err != nil {
					return err
				}
				b.WriteString(reprString(key.(string)) + ": ")
			}
			if err := reprValue(dec, b); err != nil {
				return err
			}
		}
		if _, err := dec.Token(); err != nil {
			return err
		}
		b.WriteString(closing)
	case string:
		b.WriteString(reprString(t))
	case json.Number:
		s := t.String()
		if strings.ContainsAny(s, ".eE") {
			s = floatRepr(s)
		}
		b.WriteString(s)
	case bool:
		b.WriteString(map[bool]string{true: "True", false: "False"}[t])
	case nil:
		b.WriteString("None")
	}
	return nil
}

// floatRepr is Python's repr of a float: the shortest digits that round-trip,
// in fixed notation when the decimal exponent is from -4 to 15, otherwise
// scientific with a signed two-digit exponent ('1e+16', '1.5e-05').
func floatRepr(s string) string {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return s
	}
	sci := strconv.FormatFloat(f, 'e', -1, 64)
	exp, _ := strconv.Atoi(sci[strings.IndexByte(sci, 'e')+1:])
	if exp < -4 || exp >= 16 {
		return sci
	}
	fixed := strconv.FormatFloat(f, 'f', -1, 64)
	if !strings.Contains(fixed, ".") {
		fixed += ".0"
	}
	return fixed
}

// reprString quotes like Python's repr: single quotes unless the text has a
// single quote and no double quote.
func reprString(s string) string {
	quote := byte('\'')
	if strings.Contains(s, "'") && !strings.Contains(s, `"`) {
		quote = '"'
	}
	var b strings.Builder
	b.WriteByte(quote)
	for _, r := range s {
		switch {
		case r == '\\':
			b.WriteString(`\\`)
		case r == rune(quote):
			b.WriteString(`\` + string(r))
		case r == '\n':
			b.WriteString(`\n`)
		case r == '\r':
			b.WriteString(`\r`)
		case r == '\t':
			b.WriteString(`\t`)
		case r < 0x20 || r == 0x7f:
			fmt.Fprintf(&b, `\x%02x`, r)
		default:
			b.WriteRune(r)
		}
	}
	b.WriteByte(quote)
	return b.String()
}
