package aitest

import (
	"reflect"
	"testing"
)

func TestKeepLoneHalves(t *testing.T) {
	tests := []struct{ name, raw, want string }{
		{"a lone high half", `{"t":"a\ud83d"}`, `{"t":"a\\ud83d"}`},
		{"a lone low half", `["\uDE00"]`, `["\\uDE00"]`},
		{"an escaped pair is left alone", `"\ud83d\ude00"`, `"\ud83d\ude00"`},
		{"a high half before a non-surrogate escape", `"\ud83d\u0041"`, `"\\ud83d\u0041"`},
		{"an escaped backslash before u is plain text", `"\\ud83d"`, `"\\ud83d"`},
		{"an escaped quotation mark does not end the string", `"\"\ud83d"`, `"\"\\ud83d"`},
		{"other escapes are left alone", `"\n\u00e9\/"`, `"\n\u00e9\/"`},
		{"a half at the very end", `"\ud83d`, `"\\ud83d`},
	}
	for _, tt := range tests {
		if got := string(keepLoneHalves([]byte(tt.raw))); got != tt.want {
			t.Errorf("%s: %s, want %s", tt.name, got, tt.want)
		}
	}
}

// The point of it: a lone half and U+FFFD no longer compare equal.
func TestDecodeTellsALoneHalfFromTheReplacementCharacter(t *testing.T) {
	half, err1 := Decode([]byte(`{"title":"a\ud83d"}`))
	replaced, err2 := Decode([]byte(`{"title":"a\ufffd"}`))
	if err1 != nil || err2 != nil || reflect.DeepEqual(half, replaced) {
		t.Errorf("Decode: %v (%v) and %v (%v) must differ", half, err1, replaced, err2)
	}
	pair, _ := Decode([]byte(`"\ud83d\ude00"`))
	if pair != string(rune(0x1F600)) {
		t.Errorf("an escaped pair decodes to %q", pair)
	}
}
