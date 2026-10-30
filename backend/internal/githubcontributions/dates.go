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

// dateRange retains the existing 365-day/Monday-aligned window in UTC,
// independent of the host clock's location. Millisecond formatting is unchanged.
func dateRange(now time.Time) (from, to string) {
	utc := now.UTC()
	start := utc.AddDate(0, 0, -365)
	start = start.AddDate(0, 0, -(int(start.Weekday())+6)%7)
	return start.Format(isoMillis), utc.Format(isoMillis)
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
