package jscompat

import (
	"math"
	"testing"
)

// Each answer was produced by String(Number(text)) in Node 21.
func TestStringToNumber(t *testing.T) {
	tests := []struct{ in, want string }{
		{"", "0"}, {"  ", "0"}, {"3", "3"}, {" 3 ", "3"}, {"\t\n3\r\n", "3"},
		{"+3", "3"}, {"-3", "-3"}, {"3.5", "3.5"}, {".5", "0.5"}, {"5.", "5"},
		{"1e3", "1000"}, {"1E3", "1000"}, {"1e+3", "1000"}, {"1e-3", "0.001"},
		{"0x10", "16"}, {"0X1f", "31"}, {"0o17", "15"}, {"0b101", "5"},
		{"-0x10", "NaN"}, {"+0x10", "NaN"}, {"0x", "NaN"},
		{"Infinity", "Infinity"}, {"-Infinity", "-Infinity"}, {"+Infinity", "Infinity"},
		{"infinity", "NaN"}, {"NaN", "NaN"}, {"1_000", "NaN"}, {"1,5", "NaN"}, {"3abc", "NaN"},
		{"\u00a03\ufeff", "3"}, {"\u20283\u2029", "3"}, {"00012", "12"}, {"0.1e1", "1"},
		{"e3", "NaN"}, {"..5", "NaN"}, {"5..", "NaN"}, {"1e", "NaN"}, {"1e1.5", "NaN"},
		{" 0b2", "NaN"}, {"1 2", "NaN"}, {"\u180e3", "NaN"},
		{"0x1fffffffffffff1", "144115188075855860"},
	}
	for _, tt := range tests {
		if got := formatNumber(StringToNumber(tt.in)); got != tt.want {
			t.Errorf("Number(%q) = %s, want %s", tt.in, got, tt.want)
		}
	}
}

// Each answer was produced in Node 21 by evaluating !v || v < 1 || v > 5,
// the rating check, on the JSON value.
func TestNumberInTheRatingCheck(t *testing.T) {
	tests := []struct {
		in      string
		refused bool
	}{
		{`"abc"`, false}, {`[3]`, false}, {`[]`, true}, {`[1,2]`, false}, {`true`, false},
		{`false`, true}, {`{}`, false}, {`"0"`, true}, {`"6"`, true}, {`"5"`, false},
		{`"1"`, false}, {`" 5 "`, false}, {`5.5`, true}, {`0.9`, true},
	}
	for _, tt := range tests {
		value, err := ParseJSON(tt.in)
		if err != nil {
			t.Fatal(err)
		}
		n := Number(value)
		if refused := !Truthy(value) || n < 1 || n > 5; refused != tt.refused {
			t.Errorf("rating %s: refused %v, want %v", tt.in, refused, tt.refused)
		}
	}
}

// Each answer was produced in Node 21 by rows.reduce((sum, r) => sum +
// r.rating, 0), with Undefined for a row without rating.
func TestAdd(t *testing.T) {
	tests := []struct {
		ratings []string // JSON values; "undefined" for a missing field
		want    string   // the sum as JSON.stringify writes it
	}{
		{[]string{`4`, `5`}, `9`},
		{[]string{`"3"`, `4`}, `"034"`},
		{[]string{`4`, `"3"`}, `"43"`},
		{[]string{`null`, `4`}, `4`},
		{[]string{`undefined`, `4`}, `null`},
		{[]string{`true`, `4`}, `5`},
		{[]string{`[2,3]`, `4`}, `"02,34"`},
		{[]string{`{"a":1}`}, `"0[object Object]"`},
		{[]string{`4.25`, `4.35`}, `8.6`},
		{[]string{`"4"`, `null`, `undefined`, `false`}, `"04nullundefinedfalse"`},
	}
	for _, tt := range tests {
		var sum any = 0.0
		for _, raw := range tt.ratings {
			var value any = Undefined
			if raw != "undefined" {
				value, _ = ParseJSON(raw)
			}
			sum = Add(sum, value)
		}
		var got string
		switch v := sum.(type) {
		case float64:
			got = NumberJSON(v)
		case string:
			got = `"` + v + `"`
		}
		if got != tt.want {
			t.Errorf("sum of %v = %s, want %s", tt.ratings, got, tt.want)
		}
	}
}

// Each answer was produced by Math.round(x) in Node 21.
func TestMathRound(t *testing.T) {
	tests := []struct{ in, want float64 }{
		{0.5, 1}, {1.5, 2}, {2.5, 3}, {-1.5, -1}, {-2.5, -2},
		{0.49999999999999994, 0}, {43.5, 44}, {44.5, 45}, {1e21, 1e21},
	}
	for _, tt := range tests {
		if got := MathRound(tt.in); got != tt.want {
			t.Errorf("Math.round(%v) = %v, want %v", tt.in, got, tt.want)
		}
	}
	for _, x := range []float64{-0.5, -0.4} {
		if got := MathRound(x); got != 0 || !math.Signbit(got) {
			t.Errorf("Math.round(%v) = %v, want -0", x, got)
		}
	}
	if !math.IsNaN(MathRound(math.NaN())) || !math.IsInf(MathRound(math.Inf(1)), 1) {
		t.Error("NaN and Infinity must stay as they are")
	}
}

func TestNumberJSON(t *testing.T) {
	tests := []struct {
		in   float64
		want string
	}{
		{4.5, "4.5"}, {17, "17"}, {math.Copysign(0, -1), "0"}, {math.NaN(), "null"},
		{math.Inf(1), "null"}, {1e21, "1e+21"}, {1e-7, "1e-7"},
	}
	for _, tt := range tests {
		if got := NumberJSON(tt.in); got != tt.want {
			t.Errorf("NumberJSON(%v) = %s, want %s", tt.in, got, tt.want)
		}
	}
}
