package lesson29

import (
	"regexp"
	"testing"
)

func TestUnitIndex(t *testing.T) {
	tests := []struct {
		name       string
		s          string
		byteOffset int
		want       int
	}{
		{"the start", "abc", 0, 0},
		{"plain letters: a byte is a unit", "abc", 2, 2},
		{"é: two bytes, one unit", "héllo", 3, 2},
		{"an emoji: four bytes, two units", "😀x", 4, 2},
		{"the whole text", "a😀é", 7, 4},
	}
	for _, tt := range tests {
		if got := unitIndex(tt.s, tt.byteOffset); got != tt.want {
			t.Errorf("%s: unitIndex(%q, %d) = %d, want %d", tt.name, tt.s, tt.byteOffset, got, tt.want)
		}
	}
}

// Where does "youtu.be/" start? Each want is what Node's
// text.match(/youtu\.be\//).index answers.
func TestUnitIndexOfAMatch(t *testing.T) {
	re := regexp.MustCompile(`youtu\.be/`)
	tests := []struct {
		s    string
		want int
	}{
		{"https://youtu.be/dQw4w9WgXcQ", 8},
		{"é https://youtu.be/dQw4w9WgXcQ", 10},
		{"😀 https://youtu.be/dQw4w9WgXcQ", 11},
	}
	for _, tt := range tests {
		loc := re.FindStringIndex(tt.s)
		if got := unitIndex(tt.s, loc[0]); got != tt.want {
			t.Errorf("unitIndex(%q, %d) = %d, want %d (byte offset %d)", tt.s, loc[0], got, tt.want, loc[0])
		}
	}
}
