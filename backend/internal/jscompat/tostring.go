package jscompat

import (
	"encoding/json"
	"math"
	"strconv"
	"strings"
)

// String turns a value that ParseJSON returned into text as JavaScript's
// String(value), or a template literal, does:
//
//   - null is "null", and true and false are themselves;
//   - a number is written as Number.prototype.toString writes it, so 1.5e3
//     is "1500" and 1e21 is "1e+21"; one too large for a double is
//     "Infinity";
//   - text is itself;
//   - a list is its items joined with commas, each item written the same
//     way except that null becomes nothing;
//   - an object is "[object Object]".
//
// supabase-js writes a filter such as .eq(column, value) this way, whatever
// the value is.
func String(value any) string {
	switch v := value.(type) {
	case nil:
		return "null"
	case bool:
		return strconv.FormatBool(v)
	case json.Number:
		return numberText(v)
	case string:
		return v
	case []any:
		items := make([]string, len(v))
		for i, item := range v {
			if item != nil {
				items[i] = String(item)
			}
		}
		return strings.Join(items, ",")
	}
	return "[object Object]"
}

// numberText writes a JSON number as JavaScript prints it. Go's JSON encoder
// already formats a float64 as ECMAScript's Number::toString does; what is
// left is the cases it refuses or writes differently: -0 and the infinities.
func numberText(n json.Number) string {
	// A number JSON.parse accepted always parses; one out of range comes
	// back as an infinity, which is what JavaScript reads too.
	f, _ := strconv.ParseFloat(string(n), 64)
	switch {
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
