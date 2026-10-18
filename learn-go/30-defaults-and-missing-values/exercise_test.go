package lesson30

import (
	"strings"
	"testing"
)

// Each want is what Node answers for ['a','b','c','d'].slice(start).
func TestJSSlice(t *testing.T) {
	items := []string{"a", "b", "c", "d"}
	tests := []struct {
		start int
		want  string
	}{
		{0, "a,b,c,d"},
		{2, "c,d"},
		{4, ""},
		{9, ""},
		{-1, "d"},
		{-3, "b,c,d"},
		{-4, "a,b,c,d"},
		{-9, "a,b,c,d"},
	}
	for _, tt := range tests {
		got := jsSlice(items, tt.start)
		if strings.Join(got, ",") != tt.want || (tt.want != "" && got == nil) {
			t.Errorf("jsSlice(%d) = %q, want %q", tt.start, got, tt.want)
		}
	}
	if strings.Join(items, ",") != "a,b,c,d" {
		t.Errorf("the caller's slice was changed: %q", items)
	}
}

// The share route keeps the last 50 messages: slice(-50).
func TestLastFifty(t *testing.T) {
	var messages []string
	for i := 0; i < 52; i++ {
		messages = append(messages, string(rune('A'+i%26)))
	}
	if got := jsSlice(messages, -50); len(got) != 50 || got[0] != "C" {
		t.Errorf("slice(-50) of 52 gave %q, want the 50 from the third on", got)
	}
	if got := jsSlice(messages[:3], -50); len(got) != 3 {
		t.Errorf("slice(-50) of 3 gave %d items", len(got))
	}
}
