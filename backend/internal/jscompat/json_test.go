package jscompat

import (
	"encoding/json"
	"reflect"
	"testing"
)

// Every expectation here was checked against Node:
//
//	await new Response(bytes).json()
func TestDecodeJSON(t *testing.T) {
	accepted := []struct {
		name string
		in   string
		want any
	}{
		{"object", `{"items":[]}`, map[string]any{"items": []any{}}},
		{"leading byte-order mark", "\xef\xbb\xbf" + `{"items":[]}`, map[string]any{"items": []any{}}},
		{"white space around the value", " \n\t" + `[1]` + " \r\n ", []any{json.Number("1")}},
		{"null", `null`, nil},
		{"a number keeps its digits", `1.0`, json.Number("1.0")},
		{"an exponent keeps its digits", `[1e3]`, []any{json.Number("1e3")}},
		{"a repeated key keeps the last value", `{"a":1,"a":2}`, map[string]any{"a": json.Number("2")}},
		{"bytes that are not UTF-8 inside a string", "\"a\xffb\"", "a�b"},
	}
	for _, tt := range accepted {
		got, err := DecodeJSON([]byte(tt.in))
		if err != nil || !reflect.DeepEqual(got, tt.want) {
			t.Errorf("%s: DecodeJSON = %#v, %v; want %#v", tt.name, got, err, tt.want)
		}
	}
	refused := map[string]string{
		"empty":                             ``,
		"only white space":                  `  `,
		"cut short":                         `{"items":[`,
		"text after the value":              `{"items":[]} x`,
		"a second value":                    `{"items":[]} {"second":true}`,
		"a byte-order mark inside":          `[` + "\xef\xbb\xbf" + `1]`,
		"a byte-order mark after the value": `[]` + "\xef\xbb\xbf",
		"single quotes":                     `{'a':1}`,
	}
	for name, in := range refused {
		if got, err := DecodeJSON([]byte(in)); err == nil {
			t.Errorf("%s: DecodeJSON = %#v, want an error", name, got)
		}
	}
	// The one place Go and Node differ. Node 21 accepts two leading marks:
	// its fetch removes one and its text decoder then removes another. The
	// fetch standard removes one, and so does Go.
	if got, err := DecodeJSON([]byte("\xef\xbb\xbf\xef\xbb\xbf" + `[]`)); err == nil {
		t.Errorf("two byte-order marks: DecodeJSON = %#v, want an error", got)
	}
}
