package lesson27

import (
	"math"
	"testing"
)

// Each answer was produced by Math.round(x) in Node 21.
func TestMathRound(t *testing.T) {
	tests := []struct{ in, want float64 }{
		{4.3, 4}, {4.5, 5}, {0.5, 1}, {1.5, 2}, {2.5, 3},
		{-1.5, -1}, {-2.5, -2}, {-2.6, -3},
		{43.5, 44},               // 4.35 * 10, the rating average's step
		{0.49999999999999994, 0}, // the case Floor(x + 0.5) gets wrong
		{1e21, 1e21},
	}
	for _, tt := range tests {
		if got := mathRound(tt.in); got != tt.want {
			t.Errorf("mathRound(%v) = %v, want %v", tt.in, got, tt.want)
		}
	}
	if got := mathRound(math.NaN()); !math.IsNaN(got) {
		t.Errorf("mathRound(NaN) = %v, want NaN", got)
	}
	if got := mathRound(math.Inf(1)); !math.IsInf(got, 1) {
		t.Errorf("mathRound(+Inf) = %v, want +Inf", got)
	}
}
