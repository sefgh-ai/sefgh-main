package activity

import (
	"encoding/json"
	"errors"
	"math"
	"strconv"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// readResult reads a Data API reply as supabase-js does (postgrest-js
// 2.78, PostgrestBuilder.then) and returns what it hands the handler: the
// data, and whether it reports an error. Its rules are odd in places, and
// copied as they are:
//
//   - A 2xx reply with no body has no data. One that is not JSON is an
//     error.
//   - Any other reply is an error if its body is JSON whose value is
//     truthy, or is not JSON at all. A 404 whose body is a JSON list, or
//     is empty, is not an error: it means "no rows".
func readResult(status int, raw []byte) (data any, failed bool) {
	text := jscompat.DecodeUTF8(raw)
	if status >= 200 && status <= 299 {
		if text == "" {
			return nil, false
		}
		value, err := jscompat.ParseJSON(text)
		return value, err != nil
	}
	value, err := jscompat.ParseJSON(text)
	if err != nil {
		return nil, !(status == 404 && text == "")
	}
	if _, isList := value.([]any); isList && status == 404 {
		return []any{}, false
	}
	return nil, truthy(value)
}

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
	if !truthy(data) { // if (activityData)
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
	if !truthy(value) {
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

// truthy reports whether JavaScript would treat a decoded JSON value as true.
func truthy(value any) bool {
	switch v := value.(type) {
	case nil:
		return false
	case bool:
		return v
	case string:
		return v != ""
	case json.Number:
		// A JSON number is never NaN. One too small for a double is 0 in
		// both languages, and one too large is Infinity, which is truthy.
		f, _ := strconv.ParseFloat(string(v), 64)
		return f != 0
	}
	return true
}
