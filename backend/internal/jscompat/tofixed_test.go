package jscompat

import (
	"math"
	"strconv"
	"testing"
)

// Every expected value was printed by Node 21 with x.toFixed(digits).
func TestToFixedMatchesJavaScript(t *testing.T) {
	cases := []struct {
		x      float64
		digits int
		want   string
	}{
		// Exactly halfway: JavaScript takes the larger number, Go's
		// FormatFloat the even digit.
		{0.25, 1, "0.3"},
		{0.75, 1, "0.8"},
		{2.5, 0, "3"},
		{-2.5, 0, "-3"},
		{0.5, 0, "1"},
		{1.5, 0, "2"},
		{1.25, 1, "1.3"},
		{92.0 / 368, 1, "0.3"},
		// Not halfway once the exact value of the double is known.
		{0.35, 1, "0.3"},
		{1.005, 2, "1.00"},
		{8.345, 2, "8.35"},
		{1.45, 1, "1.4"},
		{1.35, 1, "1.4"},
		{0.05, 1, "0.1"},
		{0.15, 1, "0.1"},
		{999.95, 1, "1000.0"},
		{123.456, 1, "123.5"},
		{11.0 / 370, 1, "0.0"},
		{0.000001, 7, "0.0000010"},
		{5e-324, 3, "0.000"},
		{0, 0, "0"},
		{42, 3, "42.000"},
		// The sign: -0 has none, a small negative keeps it.
		{math.Copysign(0, -1), 1, "0.0"},
		{-0.04, 1, "-0.0"},
		// Large numbers and the values that are not finite.
		{123456789012345680000, 1, "123456789012345683968.0"},
		{1e21, 1, "1e+21"},
		{-1.5e21, 2, "-1.5e+21"},
		{math.NaN(), 1, "NaN"},
		{math.Inf(1), 1, "Infinity"},
		{math.Inf(-1), 1, "-Infinity"},
	}
	for _, c := range cases {
		if got := ToFixed(c.x, c.digits); got != c.want {
			t.Errorf("ToFixed(%v, %d) = %q, JavaScript writes %q", c.x, c.digits, got, c.want)
		}
	}
}

// The reason ToFixed exists: Go's own formatting rounds a tie to even.
func TestFormatFloatRoundsTiesDifferently(t *testing.T) {
	if got := strconv.FormatFloat(0.25, 'f', 1, 64); got != "0.2" {
		t.Fatalf("FormatFloat(0.25) = %q; if Go now writes 0.3, ToFixed may be simpler", got)
	}
}
