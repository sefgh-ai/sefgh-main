//go:build !solution

package clocks

import "time"

// previousDay returns the previous local calendar day formatted as a UTC date.
// TODO: call now, subtract one calendar day, then format in UTC.
func previousDay(now func() time.Time) string {
	return ""
}
