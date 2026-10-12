package githubcontributions

import (
	"math"
	"math/big"
	"time"
)

// isoMillis is the layout of JavaScript's Date.toISOString. Formatting with
// it drops anything finer than a millisecond, which is all a JavaScript Date
// holds.
const isoMillis = "2006-01-02T15:04:05.000Z"

// dateRange returns the "from" and "to" instants sent to GitHub, written as
// JavaScript's toISOString writes them.
//
// "to" is now. "from" is 365 calendar days earlier, moved back to a Monday,
// keeping the time of day shown by a clock in loc. Because a clock in loc is
// used, the same instant gives different ranges in different time zones. The
// contract records that as a defect; this function reproduces it.
func dateRange(now time.Time, loc *time.Location) (from, to string) {
	local := now.In(loc)

	// Date.setDate(getDate() - 365): same clock time, 365 days earlier.
	start := wallClock(local.Year(), local.Month(), local.Day()-365, local, loc)

	// Back to Monday. Sunday is 0 in both languages, so Sunday goes back 6.
	daysSinceMonday := (int(start.Weekday()) + 6) % 7
	start = wallClock(start.Year(), start.Month(), start.Day()-daysSinceMonday, start, loc)

	return start.UTC().Format(isoMillis), now.UTC().Format(isoMillis)
}

// wallClock returns the instant at which a clock in loc shows the given date
// together with the time of day that clock shows.
//
// Around a daylight-saving change a clock reading can occur twice or not at
// all. JavaScript settles both cases by applying the UTC offset that was in
// force before the change. Go's time.Date leaves the choice unspecified, so
// it is made explicitly here.
func wallClock(year int, month time.Month, day int, clock time.Time, loc *time.Location) time.Time {
	// The requested reading, written as if it were UTC. Day may be zero or
	// negative; time.Date normalises it.
	reading := time.Date(year, month, day, clock.Hour(), clock.Minute(), clock.Second(), clock.Nanosecond(), time.UTC)

	// The offsets in force a day either side. They differ only when a
	// change falls in between.
	_, before := reading.Add(-24 * time.Hour).In(loc).Zone()
	_, after := reading.Add(24 * time.Hour).In(loc).Zone()
	early := reading.Add(-time.Duration(before) * time.Second)
	late := reading.Add(-time.Duration(after) * time.Second)

	// The result is returned in loc, so that the caller reads its date,
	// weekday and time of day as that clock shows them.
	switch {
	case shows(early, reading, loc):
		// The usual case, and the first of two occurrences.
		return early.In(loc)
	case shows(late, reading, loc):
		return late.In(loc)
	default:
		// The reading was skipped. The earlier offset carries it past the gap.
		return early.In(loc)
	}
}

// shows reports whether a clock in loc reads the same as reading at instant.
func shows(instant, reading time.Time, loc *time.Location) bool {
	local := instant.In(loc)
	return local.Year() == reading.Year() && local.YearDay() == reading.YearDay() &&
		local.Hour() == reading.Hour() && local.Minute() == reading.Minute() &&
		local.Second() == reading.Second() && local.Nanosecond() == reading.Nanosecond()
}

// toFixed1 rounds x to one decimal place exactly as JavaScript's
// parseFloat(x.toFixed(1)) does: it rounds the value the float64 really
// holds, and an exact tie goes away from zero.
//
// strconv.FormatFloat(x, 'f', 1, 64) is not the same. It sends an exact tie
// to the even digit, so 0.25 would become 0.2 where JavaScript gives 0.3.
func toFixed1(x float64) float64 {
	// Beyond 1e21 toFixed switches to exponent notation and changes nothing.
	if math.IsNaN(x) || math.IsInf(x, 0) || math.Abs(x) >= 1e21 {
		return x
	}
	// big.Rat holds the float64 exactly, so no rounding happens before the
	// one rounding that is wanted: tenths = floor(|x|*10 + 1/2).
	tenths := new(big.Rat).SetFloat64(math.Abs(x))
	tenths.Mul(tenths, big.NewRat(10, 1))
	tenths.Add(tenths, big.NewRat(1, 2))
	whole := new(big.Int).Div(tenths.Num(), tenths.Denom())

	result, _ := new(big.Rat).SetFrac(whole, big.NewInt(10)).Float64()
	if result == 0 {
		return 0 // never negative zero
	}
	if x < 0 {
		return -result
	}
	return result
}
