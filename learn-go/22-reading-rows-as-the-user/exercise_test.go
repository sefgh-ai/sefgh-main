package lesson22

import (
	"math"
	"strconv"
	"testing"
)

// Every answer is what Node prints for x.toFixed(1), read as tenths.
func TestTenthsRoundsAsJavaScriptDoes(t *testing.T) {
	cases := []struct {
		x    float64
		want int64
	}{
		{0, 0},
		{0.04, 0},
		{0.25, 3},  // exactly halfway: up, where Go's FormatFloat says 0.2
		{0.75, 8},  // exactly halfway: up
		{1.25, 13}, // exactly halfway: up
		{0.35, 3},  // stored as 0.3499999...: down
		{1.45, 14}, // stored as 1.4499999...: down
		{0.05, 1},  // stored as 0.0500000...03: up
		{999.95, 10000},
		{123.456, 1235},
		{92.0 / 368, 3}, // 92 actions over 368 days
		{11.0 / 370, 0},
	}
	for _, c := range cases {
		if got := tenths(c.x); got != c.want {
			t.Errorf("tenths(%v) = %d, want %d", c.x, got, c.want)
		}
	}
}

// Away from a tie, the answer agrees with Go's own rounding.
func TestTenthsAgreesWithFormatFloatAwayFromTies(t *testing.T) {
	for _, x := range []float64{0.1, 0.33, 2.71828, 64.04, 1234.56} {
		text := strconv.FormatFloat(x, 'f', 1, 64)
		want, _ := strconv.ParseFloat(text, 64)
		if got := tenths(x); got != int64(math.Round(want*10)) {
			t.Errorf("tenths(%v) = %d, FormatFloat gives %s", x, got, text)
		}
	}
}
