package jscompat

import (
	"encoding/json"
	"math"
	"math/big"
	"strconv"
	"strings"
)

// Undefined is JavaScript's undefined: what reading a field an object does
// not have gives. ParseJSON never returns it; handlers use it for a missing
// field.
var Undefined = undefined{}

type undefined struct{}

// Number converts a value to a number as JavaScript's Number(value), or a
// comparison with a number, does. The values are those ParseJSON returns,
// plus float64 and Undefined:
//
//   - null is 0, undefined is NaN, true is 1 and false is 0;
//   - text is read by StringToNumber;
//   - a list is first written as String writes it, then read as text, so
//     [3] is 3 and [] is 0;
//   - an object is NaN.
func Number(value any) float64 {
	switch v := value.(type) {
	case nil:
		return 0
	case undefined:
		return math.NaN()
	case bool:
		if v {
			return 1
		}
		return 0
	case float64:
		return v
	case json.Number:
		f, _ := strconv.ParseFloat(string(v), 64)
		return f
	case string:
		return StringToNumber(v)
	case []any:
		return StringToNumber(String(v))
	}
	return math.NaN()
}

// StringToNumber reads text as JavaScript's Number(text) does: white space
// around it is ignored, empty text is 0, "Infinity" with or without a sign
// counts, 0x, 0o and 0b introduce hexadecimal, octal and binary digits
// (without a sign), and anything else that is not a decimal number is NaN.
func StringToNumber(s string) float64 {
	s = Trim(s)
	switch s {
	case "":
		return 0
	case "Infinity", "+Infinity":
		return math.Inf(1)
	case "-Infinity":
		return math.Inf(-1)
	}
	if len(s) > 2 && s[0] == '0' {
		switch s[1] {
		case 'x', 'X':
			return radix(s[2:], 16)
		case 'o', 'O':
			return radix(s[2:], 8)
		case 'b', 'B':
			return radix(s[2:], 2)
		}
	}
	if !decimalLiteral(s) {
		return math.NaN()
	}
	// The shape is a decimal literal, so this parses; a value out of range
	// comes back as an infinity or 0, as in JavaScript.
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// radix reads digits in a base exactly, then rounds once to the nearest
// double, as JavaScript does. Any other character makes it NaN.
func radix(digits string, base int) float64 {
	for _, c := range strings.ToLower(digits) {
		d := strings.IndexRune("0123456789abcdef", c)
		if d < 0 || d >= base {
			return math.NaN()
		}
	}
	n, _ := new(big.Int).SetString(digits, base)
	f, _ := new(big.Float).SetInt(n).Float64()
	return f
}

// decimalLiteral reports whether s is a JavaScript StrDecimalLiteral: an
// optional sign, digits with an optional point and at least one digit, and
// an optional exponent with digits. strconv.ParseFloat accepts more ("inf",
// "1_000", hexadecimal fractions), so the shape is checked first.
func decimalLiteral(s string) bool {
	i := 0
	if i < len(s) && (s[i] == '+' || s[i] == '-') {
		i++
	}
	digits := 0
	for i < len(s) && '0' <= s[i] && s[i] <= '9' {
		i, digits = i+1, digits+1
	}
	if i < len(s) && s[i] == '.' {
		i++
		for i < len(s) && '0' <= s[i] && s[i] <= '9' {
			i, digits = i+1, digits+1
		}
	}
	if digits == 0 {
		return false
	}
	if i < len(s) && (s[i] == 'e' || s[i] == 'E') {
		i++
		if i < len(s) && (s[i] == '+' || s[i] == '-') {
			i++
		}
		exponent := 0
		for i < len(s) && '0' <= s[i] && s[i] <= '9' {
			i, exponent = i+1, exponent+1
		}
		if exponent == 0 {
			return false
		}
	}
	return i == len(s)
}

// Add is JavaScript's a + b for these values. A list or an object first
// becomes text. Then, when either side is text, the two are joined as text;
// otherwise they are added as numbers. So 0 + "3" is "03", and 4 + null is
// 4. The result is a float64 or a string.
func Add(a, b any) any {
	pa, pb := primitive(a), primitive(b)
	_, aText := pa.(string)
	_, bText := pb.(string)
	if aText || bText {
		return String(pa) + String(pb)
	}
	return Number(pa) + Number(pb)
}

// primitive is ToPrimitive without a hint: a list or an object becomes its
// text, and anything else stays as it is.
func primitive(value any) any {
	switch value.(type) {
	case []any, map[string]any:
		return String(value)
	}
	return value
}

// MathRound is JavaScript's Math.round: the nearest integer, and a value
// exactly halfway goes up, so 2.5 is 3 and -2.5 is -2. NaN and the
// infinities stay as they are, and a negative value that rounds to 0 is -0.
// Adding 0.5 and rounding down, the usual trick, gets 0.49999999999999994
// wrong.
func MathRound(x float64) float64 {
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return x
	}
	r := math.Floor(x)
	if x-r >= 0.5 {
		r++
	}
	if r == 0 && math.Signbit(x) {
		return math.Copysign(0, -1)
	}
	return r
}

// NumberJSON writes a number as JSON.stringify does: NaN and the infinities
// are null, -0 is 0, and everything else as String writes it.
func NumberJSON(f float64) string {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return "null"
	}
	return formatNumber(f)
}

// formatNumber is Number.prototype.toString. Go's JSON encoder already
// formats a finite float64 the way ECMAScript does; what is left is -0, NaN
// and the infinities.
func formatNumber(f float64) string {
	switch {
	case math.IsNaN(f):
		return "NaN"
	case math.IsInf(f, 1):
		return "Infinity"
	case math.IsInf(f, -1):
		return "-Infinity"
	case f == 0:
		return "0"
	}
	text, _ := json.Marshal(f)
	return string(text)
}
