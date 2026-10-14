package jscompat

import (
	"math"
	"math/big"
	"strconv"
	"strings"
)

// ToFixed writes x with the given number of digits after the point, as
// JavaScript's x.toFixed(digits) does, for digits from 0 to 100.
//
// strconv.FormatFloat(x, 'f', digits, 64) differs where x lies exactly
// halfway: Go rounds to the even digit and JavaScript to the larger number,
// so 0.25 is "0.2" in Go and "0.3" in JavaScript. The halfway test is made
// on the exact value of x, never on a rounded copy, as the specification
// says.
func ToFixed(x float64, digits int) string {
	if digits < 0 || digits > 100 {
		panic("jscompat.ToFixed: digits must be from 0 to 100")
	}
	if math.IsNaN(x) {
		return "NaN"
	}
	if math.IsInf(x, 0) {
		if x > 0 {
			return "Infinity"
		}
		return "-Infinity"
	}
	sign := ""
	if x < 0 { // -0 is not below 0, so it is written "0", as in JavaScript.
		sign, x = "-", -x
	}
	if x >= 1e21 {
		// JavaScript writes these as String(x) does. For numbers this
		// large that is the shortest digits in exponent form, which is
		// also what Go's 'g' format writes.
		return sign + strconv.FormatFloat(x, 'g', -1, 64)
	}
	// n is the integer closest to x * 10^digits, the larger one on a tie:
	// floor(x * 10^digits + 1/2), worked out exactly.
	scaled := new(big.Rat).SetFloat64(x)
	scaled.Mul(scaled, new(big.Rat).SetInt(new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(digits)), nil)))
	scaled.Add(scaled, big.NewRat(1, 2))
	n := new(big.Int).Quo(scaled.Num(), scaled.Denom()) // both are positive, so this is the floor
	m := n.String()
	if digits == 0 {
		return sign + m
	}
	if len(m) <= digits {
		m = strings.Repeat("0", digits+1-len(m)) + m
	}
	return sign + m[:len(m)-digits] + "." + m[len(m)-digits:]
}
