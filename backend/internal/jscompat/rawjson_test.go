package jscompat

import (
	"bytes"
	"testing"
)

func TestObjectFieldsKeepOrderAndJavaScriptsRepeatedNames(t *testing.T) {
	fields, ok := ObjectFields([]byte(` {"b":1, "a":{"x":[1, 2]}, "b":"last", "c":null} `))
	if !ok {
		t.Fatal("a valid object was refused")
	}
	var got bytes.Buffer
	WriteObject(&got, fields)
	// "b" stays first, as JSON.parse places it, with its last value.
	if want := `{"b":"last","a":{"x":[1, 2]},"c":null}`; got.String() != want {
		t.Errorf("got %s, want %s", got.String(), want)
	}
}

func TestObjectFieldsRefusesWhatJSONParseWould(t *testing.T) {
	for _, text := range []string{``, `[]`, `"x"`, `null`, `{"a":1`, `{"a":1} x`, `{"a":1}{}`, `{a:1}`} {
		if _, ok := ObjectFields([]byte(text)); ok {
			t.Errorf("%q was taken as an object", text)
		}
	}
}

func TestElements(t *testing.T) {
	elements, ok := Elements([]byte(`[ {"a":1}, null, "x", 1e21, [2] ]`))
	if !ok || len(elements) != 5 {
		t.Fatalf("got %d elements, ok %v", len(elements), ok)
	}
	if string(elements[3]) != "1e21" {
		t.Errorf("a number was rewritten: %s", elements[3])
	}
	for _, text := range []string{`{}`, `[1,`, `[1] 2`} {
		if _, ok := Elements([]byte(text)); ok {
			t.Errorf("%q was taken as an array", text)
		}
	}
}

func TestKind(t *testing.T) {
	for raw, want := range map[string]byte{`{}`: '{', ` [1]`: '[', `"s"`: '"', `null`: 'n', `true`: 't', `false`: 'f', `-1.5`: '0'} {
		if got := Kind([]byte(raw)); got != want {
			t.Errorf("Kind(%s) = %c, want %c", raw, got, want)
		}
	}
}
