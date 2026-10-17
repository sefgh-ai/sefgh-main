package jscompat

import (
	"math"
	"math/big"
	"strconv"
	"strings"
)

// ParseInt reads text as JavaScript's parseInt(text) does, with no radix:
// white space at the start is skipped, then an optional sign, then 0x or 0X
// for hexadecimal digits; otherwise decimal digits. It reads as many digits
// as it can and ignores the rest, so " 7px" is 7 and "12.9" is 12. With no
// digits at all it is NaN. Unlike Number, a sign may come before 0x, and
// "-0" is -0.
func ParseInt(s string) float64 {
	s = strings.TrimLeftFunc(s, isJSSpace)
	negative := false
	if s != "" && (s[0] == '+' || s[0] == '-') {
		negative = s[0] == '-'
		s = s[1:]
	}
	base := 10
	if len(s) >= 2 && s[0] == '0' && (s[1] == 'x' || s[1] == 'X') {
		base, s = 16, s[2:]
	}
	end := 0
	for end < len(s) && digitValue(s[end]) < base {
		end++
	}
	if end == 0 {
		return math.NaN()
	}
	var value float64
	if base == 10 {
		// The digits alone are a decimal literal; ParseFloat rounds them to
		// the nearest double, as JavaScript does.
		value, _ = strconv.ParseFloat(s[:end], 64)
	} else {
		n, _ := new(big.Int).SetString(s[:end], base)
		value, _ = new(big.Float).SetInt(n).Float64()
	}
	if negative {
		return -value
	}
	return value
}

// digitValue is a character's value as a digit in bases up to 16, or 99
// for anything that is not one.
func digitValue(c byte) int {
	switch {
	case '0' <= c && c <= '9':
		return int(c - '0')
	case 'a' <= c && c <= 'f':
		return int(c-'a') + 10
	case 'A' <= c && c <= 'F':
		return int(c-'A') + 10
	}
	return 99
}
