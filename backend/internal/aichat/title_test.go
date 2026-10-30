package aichat

import (
	"encoding/json"
	"strings"
	"testing"
)

// Each expected value is what src/lib/ai/github.js produced for the same
// message in Node 21. Messages are built from code points so this file stays
// ASCII.
func TestFallbackTitle(t *testing.T) {
	emoji := string(rune(0x1F600))
	tests := []struct{ name, message, want string }{
		{"short", "hi", `"hi"`},
		{"four words", "please help me find a good charting library", `"please help me find"`},
		{"thirty units, no dots", "abcdefg abcdefg abcdefg abcdef and more", `"abcdefg abcdefg abcdefg abcdef"`},
		{"thirty-one units, cut", "abcdefg abcdefg abcdefg abcdefg and more", `"abcdefg abcdefg abcdefg abcdef..."`},
		{"repeated spaces collapse", "a  b   c d e", `"a b c d"`},
		{"emoji stays whole", "I love " + strings.Repeat(emoji, 12) + " and more", `"I love ` + strings.Repeat(emoji, 12) + ` and"`},
		{"emoji counts once", strings.Repeat(emoji, 15) + " x", `"` + strings.Repeat(emoji, 15) + ` x"`},
		{"empty", "", `""`},
	}
	for _, tt := range tests {
		got, err := json.Marshal(fallbackTitle(tt.message))
		if err != nil || string(got) != tt.want {
			t.Errorf("%s: %s, want %s", tt.name, got, tt.want)
		}
	}
}

func TestCleanTitle(t *testing.T) {
	tests := []struct{ in, want string }{
		{`"Fixing Flaky Tests"`, "Fixing Flaky Tests"},
		{` "It's done" `, "Its done"},
		{`"''"`, ""},
		{string(rune(0xFEFF)) + " Title" + string(rune(0x85)), "Title" + string(rune(0x85))},
	}
	for _, tt := range tests {
		if got := cleanTitle(tt.in); got != tt.want {
			t.Errorf("cleanTitle(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
