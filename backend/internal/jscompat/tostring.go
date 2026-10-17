package jscompat

import (
	"encoding/json"
	"strconv"
	"strings"
)

// String turns a value that ParseJSON returned into text as JavaScript's
// String(value), or a template literal, does:
//
//   - null is "null", undefined is "undefined", and true and false are
//     themselves;
//   - a number, a JSON one or a float64, is written as
//     Number.prototype.toString writes it, so 1.5e3 is "1500" and 1e21 is
//     "1e+21"; one too large for a double is "Infinity";
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
	case undefined:
		return "undefined"
	case bool:
		return strconv.FormatBool(v)
	case json.Number:
		// A number JSON.parse accepted always parses; one out of range comes
		// back as an infinity, which is what JavaScript reads too.
		f, _ := strconv.ParseFloat(string(v), 64)
		return formatNumber(f)
	case float64:
		return formatNumber(v)
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
