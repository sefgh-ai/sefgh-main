//go:build solution

package clocks

import "time"

func previousDay(now func() time.Time) string {
	return now().AddDate(0, 0, -1).UTC().Format("2006-01-02")
}
