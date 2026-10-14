package jscompat

import (
	"encoding/json"
	"testing"
)

// Every expected value is what JSON.stringify wrote for the same units in
// Node 21. The input is built from code points so this file stays ASCII.
func TestUTF16WritesJSONAsJavaScriptDoes(t *testing.T) {
	emoji := string(rune(0x1F600))
	tests := []struct {
		name  string
		units UTF16
		want  string
	}{
		{"plain", ToUTF16("abc"), `"abc"`},
		{"a pair is written as its character", ToUTF16("a" + emoji + "b"), `"a` + emoji + `b"`},
		{"a high half left by a cut", ToUTF16("ab" + emoji)[:3], `"ab\ud83d"`},
		{"a low half alone", UTF16{0xDE00}, `"\ude00"`},
		{"a low half before a high half is not a pair", UTF16{0xDE00, 0xD83D}, `"\ude00\ud83d"`},
		{"control characters", ToUTF16("\x00\x1f\b\f\n\r\t\"\\"), `"\u0000\u001f\b\f\n\r\t\"\\"`},
		{"delete is not a control character here", ToUTF16("\x7f"), "\"\x7f\""},
		{"no HTML escaping", ToUTF16("<>&"), `"<>&"`},
		{"line separators as themselves", ToUTF16(string(rune(0x2028)) + string(rune(0x2029))), `"` + string(rune(0x2028)) + string(rune(0x2029)) + `"`},
		{"the replacement character as itself", ToUTF16(string(rune(0xFFFD))), `"` + string(rune(0xFFFD)) + `"`},
		{"empty", UTF16{}, `""`},
	}
	for _, tt := range tests {
		got, err := tt.units.MarshalJSON()
		if err != nil || string(got) != tt.want {
			t.Errorf("%s: MarshalJSON = %s, %v; want %s", tt.name, got, err, tt.want)
		}
	}
}

// Inside a larger value Go's encoder tidies what MarshalJSON wrote, and may
// escape <, > and &. It must keep the escape for a lone half.
func TestUTF16InsideAnObjectKeepsTheLoneHalf(t *testing.T) {
	got, err := json.Marshal(map[string]any{"title": UTF16{'a', 0xD83D}})
	if err != nil || string(got) != `{"title":"a\ud83d"}` {
		t.Errorf("json.Marshal = %s, %v", got, err)
	}
}

func TestToUTF16CountsAsJavaScriptDoes(t *testing.T) {
	for _, s := range []string{"", "abc", string(rune(0x1F600)), "a" + string(rune(0xE9)) + string(rune(0x1F600))} {
		if got, want := len(ToUTF16(s)), UTF16Len(s); got != want {
			t.Errorf("%q: %d units, UTF16Len says %d", s, got, want)
		}
	}
}
