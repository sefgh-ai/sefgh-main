package lesson03

import "testing"

func TestIsUnreserved(t *testing.T) {
	for _, c := range []byte("AZaz09-_.!~*'()") {
		if !isUnreserved(c) {
			t.Errorf("isUnreserved(%q) = false, want true", c)
		}
	}
	for _, c := range []byte(" #%&+,/:;=?@[]\"<>") {
		if isUnreserved(c) {
			t.Errorf("isUnreserved(%q) = true, want false", c)
		}
	}
}

// The expected values were produced by JavaScript's encodeURIComponent.
func TestPercentEncode(t *testing.T) {
	tests := []struct{ in, want string }{
		{"react", "react"},
		{"a b", "a%20b"},
		{"C#", "C%23"},
		{"c++ & rust", "c%2B%2B%20%26%20rust"},
		{"it's (fun)!*", "it's%20(fun)!*"},
		{"é", "%C3%A9"},
		{"日本", "%E6%97%A5%E6%9C%AC"},
		{"react language:\"Jupyter Notebook\"", "react%20language%3A%22Jupyter%20Notebook%22"},
		{"", ""},
	}
	for _, tt := range tests {
		if got := percentEncode(tt.in); got != tt.want {
			t.Errorf("percentEncode(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestCountCharacters(t *testing.T) {
	tests := []struct {
		in   string
		want int
	}{
		{"react", 5},
		{"é", 1},
		{"日本", 2},
		{"", 0},
	}
	for _, tt := range tests {
		if got := countCharacters(tt.in); got != tt.want {
			t.Errorf("countCharacters(%q) = %d, want %d", tt.in, got, tt.want)
		}
	}
}
