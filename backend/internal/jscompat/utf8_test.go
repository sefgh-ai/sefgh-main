package jscompat

import (
	"encoding/hex"
	"testing"
)

// Expected values were produced by Node.js 21: TextDecoder("utf-8") for
// "strip", which is what Response.text() does, and the same decoder with
// ignoreBOM for "keep", which is what URLSearchParams does.
func TestDecodeUTF8(t *testing.T) {
	const bad = 0xFFFD
	tests := []struct {
		bytes string
		strip []rune
		keep  []rune
	}{
		{"", nil, nil},
		{"41", []rune{'A'}, []rune{'A'}},
		{"c3a9", []rune{0xE9}, []rune{0xE9}},
		{"e697a5", []rune{0x65E5}, []rune{0x65E5}},
		{"f09f9880", []rune{0x1F600}, []rune{0x1F600}},
		// A byte-order mark is dropped only at the very start, and only by "strip".
		{"efbbbf41", []rune{'A'}, []rune{0xFEFF, 'A'}},
		{"41efbbbf", []rune{'A', 0xFEFF}, []rune{'A', 0xFEFF}},
		{"ff", []rune{bad}, []rune{bad}},
		// UTF-16 with its own byte-order mark, GBK, and Latin-1 text.
		{"fffe48006900", []rune{bad, bad, 'H', 0, 'i', 0}, []rune{bad, bad, 'H', 0, 'i', 0}},
		{"c4e3bac3", []rune{bad, bad, bad}, []rune{bad, bad, bad}},
		{"636166e9", []rune{'c', 'a', 'f', bad}, []rune{'c', 'a', 'f', bad}},
		// One replacement for an unfinished sequence, however many bytes it had.
		{"e38041", []rune{bad, 'A'}, []rune{bad, 'A'}},
		{"e341", []rune{bad, 'A'}, []rune{bad, 'A'}},
		{"f09f98", []rune{bad}, []rune{bad}},
		{"f09f41", []rune{bad, 'A'}, []rune{bad, 'A'}},
		// Overlong forms, surrogates and values past U+10FFFF: one per byte.
		{"c080", []rune{bad, bad}, []rune{bad, bad}},
		{"c1bf", []rune{bad, bad}, []rune{bad, bad}},
		{"e08080", []rune{bad, bad, bad}, []rune{bad, bad, bad}},
		{"e09fbf", []rune{bad, bad, bad}, []rune{bad, bad, bad}},
		{"eda080", []rune{bad, bad, bad}, []rune{bad, bad, bad}},
		{"ed9fbf", []rune{0xD7FF}, []rune{0xD7FF}},
		{"f0808080", []rune{bad, bad, bad, bad}, []rune{bad, bad, bad, bad}},
		{"f08fbfbf", []rune{bad, bad, bad, bad}, []rune{bad, bad, bad, bad}},
		{"f0908080", []rune{0x10000}, []rune{0x10000}},
		{"f4908080", []rune{bad, bad, bad, bad}, []rune{bad, bad, bad, bad}},
		{"f48fbfbf", []rune{0x10FFFF}, []rune{0x10FFFF}},
		{"f5808080", []rune{bad, bad, bad, bad}, []rune{bad, bad, bad, bad}},
		{"80", []rune{bad}, []rune{bad}},
		{"bf41", []rune{bad, 'A'}, []rune{bad, 'A'}},
		{"c3", []rune{bad}, []rune{bad}},
		{"c3c3a9", []rune{bad, 0xE9}, []rune{bad, 0xE9}},
	}
	for _, tt := range tests {
		raw, err := hex.DecodeString(tt.bytes)
		if err != nil {
			t.Fatal(err)
		}
		if got := DecodeUTF8(raw); got != string(tt.strip) {
			t.Errorf("DecodeUTF8(%s) = %+q, want %+q", tt.bytes, got, string(tt.strip))
		}
		if got := decodeUTF8(raw); got != string(tt.keep) {
			t.Errorf("decodeUTF8(%s) = %+q, want %+q", tt.bytes, got, string(tt.keep))
		}
	}
}

// A query string decodes its bad bytes the same way, without dropping a
// byte-order mark.
func TestParseQueryDecodesBadBytesLikeABrowser(t *testing.T) {
	tests := []struct {
		raw  string
		want []rune
	}{
		{"q=a%FF%FFb", []rune{'a', 0xFFFD, 0xFFFD, 'b'}},
		{"q=%E3%80A", []rune{0xFFFD, 'A'}},
		{"q=%EF%BB%BFa", []rune{0xFEFF, 'a'}},
	}
	for _, tt := range tests {
		got, _ := ParseQuery(tt.raw).Get("q")
		if got != string(tt.want) {
			t.Errorf("ParseQuery(%q) q = %+q, want %+q", tt.raw, got, string(tt.want))
		}
	}
}
