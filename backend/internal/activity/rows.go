package activity

import (
	"encoding/json"
	"errors"
	"math"
	"strconv"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// errRows says the rows are of a kind the Next.js handler throws on, or
// that Go does not follow it into (see sumRows).
var errRows = errors.New("rows of an unexpected kind")

// sumRows adds up each date's count, as the handler's loop over the rows
// does, and returns the totals by date and over every row.
//
// JavaScript lets most odd values through: a row that is not an object has
// no fields, so it counts 0, and a date that is not text is never on the
// grid but still counts in the total. It throws on a reply that is truthy
// but not a list, and on a row that is null; that is a 500 with "Internal
// server error". Go answers the same. A count that is truthy but not a
// number would be added as text by JavaScript ("1" + "2" is "12"); Go
// refuses it with the same 500. The database column holds numbers, so no
// real reply has one.
func sumRows(data any) (map[string]float64, float64, error) {
	counts := map[string]float64{}
	total := 0.0
	if !supabaserest.Truthy(data) { // if (activityData)
		return counts, total, nil
	}
	rows, isList := data.([]any)
	if !isList {
		return nil, 0, errRows
	}
	for _, row := range rows {
		if row == nil {
			return nil, 0, errRows
		}
		fields, _ := row.(map[string]any)
		count, ok := countOf(fields["activity_count"])
		if !ok {
			return nil, 0, errRows
		}
		if date, isText := fields["activity_date"].(string); isText {
			// if (activityMap[date]) add, else set: a total of 0 or NaN is
			// replaced, not added to.
			if sum := counts[date]; sum != 0 && !math.IsNaN(sum) {
				counts[date] = sum + count
			} else {
				counts[date] = count
			}
		}
		total += count
	}
	return counts, total, nil
}

// countOf is row.activity_count || 0. ok is false for a truthy value that
// is not a number.
func countOf(value any) (float64, bool) {
	if !supabaserest.Truthy(value) {
		return 0, true
	}
	n, isNumber := value.(json.Number)
	if !isNumber {
		return 0, false
	}
	// JSON.parse turns a number too large for a double into Infinity, as
	// ParseFloat does; its range error is not a failure here.
	f, _ := strconv.ParseFloat(string(n), 64)
	return f, true
}
