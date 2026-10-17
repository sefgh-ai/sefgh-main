package jscompat

import (
	"math"
	"testing"
)

// Each answer was produced by String(parseInt(text)) in Node 21, with -0
// written as "-0".
func TestParseInt(t *testing.T) {
	tests := []struct{ in, want string }{
		{" 7px", "7"}, {"0x10", "16"}, {"abc", "NaN"}, {"-3", "-3"}, {"", "NaN"}, {"  ", "NaN"},
		{"+5", "5"}, {"-0", "-0"}, {"1e3", "1"}, {"12.9", "12"}, {"0x", "NaN"}, {"-0x1f", "-31"},
		{"+0X1F", "31"}, {"\u00a07", "7"}, {"99999999999999999999", "100000000000000000000"},
		{"0b11", "0"}, {"Infinity", "NaN"}, {"  -  5", "NaN"}, {"0x1g", "1"}, {"007", "7"},
		{"1_000", "1"}, {"\u0663", "NaN"}, {" \n\t42abc", "42"}, {"0xffffffffffffffffff", "4.722366482869645e+21"},
	}
	for _, tt := range tests {
		got := ParseInt(tt.in)
		text := formatNumber(got)
		if got == 0 && math.Signbit(got) {
			text = "-0"
		}
		if text != tt.want {
			t.Errorf("parseInt(%q) = %s, want %s", tt.in, text, tt.want)
		}
	}
}
