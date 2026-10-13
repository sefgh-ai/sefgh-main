package jscompat

import "testing"

// u builds text from code points, so that no invisible character has to sit
// in this file.
func u(codes ...rune) string { return string(codes) }

// Every "want" here was produced by Node for the same input.

func TestTrim(t *testing.T) {
	tests := []struct{ name, in, want string }{
		{"plain", "  go  ", "go"},
		{"tabs and line ends", "\t\n\v\f\r go \r\n", "go"},
		{"no-break space", u(0xA0) + "go" + u(0xA0), "go"},
		{"byte-order mark", u(0xFEFF) + "go" + u(0xFEFF), "go"},
		{"line and paragraph separators", u(0x2028) + "go" + u(0x2029), "go"},
		{"wide spaces", u(0x1680, 0x2000, 0x200A, 0x202F, 0x205F, 0x3000) + "go", "go"},
		{"next line U+0085 is kept", u(0x85) + "go" + u(0x85), u(0x85) + "go" + u(0x85)},
		{"zero width space U+200B is kept", u(0x200B) + "go" + u(0x200B), u(0x200B) + "go" + u(0x200B)},
		{"inner space is kept", " a b ", "a b"},
		{"only white space", " \t" + u(0xFEFF) + " ", ""},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		if got := Trim(tt.in); got != tt.want {
			t.Errorf("%s: Trim(%q) = %q, want %q", tt.name, tt.in, got, tt.want)
		}
	}
}

func TestUTF16Len(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want int
	}{
		{"empty", "", 0},
		{"ASCII", "go", 2},
		{"three Japanese characters", u(0x65E5, 0x672C, 0x8A9E), 3},
		{"one emoji is two units", u(0x1F600), 2},
		{"emoji between letters", "a" + u(0x1F600) + "b", 4},
		{"e and a combining accent", "e" + u(0x301), 2},
	}
	for _, tt := range tests {
		if got := UTF16Len(tt.in); got != tt.want {
			t.Errorf("%s: UTF16Len(%q) = %d, want %d", tt.name, tt.in, got, tt.want)
		}
	}
}

func TestToLowerCase(t *testing.T) {
	tests := []struct{ name, in, want string }{
		{"ASCII", "React Native", "react native"},
		{"symbol", "C#", "c#"},
		{"accented capital", u(0xC9) + "COLE", u(0xE9) + "cole"},
		{"no case", u(0x65E5, 0x672C, 0x8A9E), u(0x65E5, 0x672C, 0x8A9E)},
		{"Kelvin sign becomes k", u(0x212A) + "elvin", "kelvin"},
		{"dotted capital I becomes i and a combining dot", u(0x130) + "OS", "i" + u(0x307) + "os"},
		{"plain capital I", "IOS", "ios"},
	}
	for _, tt := range tests {
		if got := ToLowerCase(tt.in); got != tt.want {
			t.Errorf("%s: ToLowerCase(%q) = %q, want %q", tt.name, tt.in, got, tt.want)
		}
	}
}
