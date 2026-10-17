//go:build !solution

package lesson27

// mathRound is JavaScript's Math.round: the nearest whole number, and a
// value exactly halfway goes up (toward +Infinity), so 2.5 is 3 and -2.5 is
// -2. NaN and the infinities stay as they are.
//
// TODO:
//  1. NaN or an infinity (math.IsNaN, math.IsInf): return x unchanged.
//  2. r := math.Floor(x), the whole number at or below x.
//  3. If x-r >= 0.5, add 1 to r.
//  4. Return r.
//
// Do not use math.Floor(x + 0.5): for 0.49999999999999994 the addition
// itself rounds up to 1, and the answer is wrong. Import "math".
func mathRound(x float64) float64 {
	return x
}
