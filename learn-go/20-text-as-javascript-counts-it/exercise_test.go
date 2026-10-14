package lesson20

import (
	"slices"
	"strings"
	"testing"
	"unicode/utf16"
)

// units is the text as JavaScript holds it.
func units(s string) []uint16 { return utf16.Encode([]rune(s)) }

// Each expected title is what src/lib/ai/github.js gave for the same
// message in Node 21. The emoji is built from its code point so this file
// stays plain ASCII.
func TestFallbackTitle(t *testing.T) {
	emoji := string(rune(0x1F600))
	tests := []struct {
		name    string
		message string
		want    []uint16
	}{
		{"short", "hi", units("hi")},
		{"the first four words", "please help me find a good charting library", units("please help me find")},
		{"exactly thirty units: no dots", "abcdefg abcdefg abcdefg abcdef and more", units("abcdefg abcdefg abcdefg abcdef")},
		{"thirty-one units: cut and dotted", "abcdefg abcdefg abcdefg abcdefg and more", units("abcdefg abcdefg abcdefg abcdef...")},
		{"repeated spaces make empty words", "a  b   c d e", units("a  b ")},
		{"an emoji counts as two units", strings.Repeat(emoji, 15) + " x", units(strings.Repeat(emoji, 15) + "...")},
		// Unit 30 is the high half of the twelfth emoji. JavaScript keeps it.
		{"an emoji cut in two", "I love " + strings.Repeat(emoji, 12) + " and more", append(units("I love "+strings.Repeat(emoji, 11)), 0xD83D, '.', '.', '.')},
	}
	for _, tt := range tests {
		got := fallbackTitle(tt.message)
		if !slices.Equal(got, tt.want) {
			t.Errorf("%s:\n got %v\nwant %v", tt.name, got, tt.want)
		}
	}
}
