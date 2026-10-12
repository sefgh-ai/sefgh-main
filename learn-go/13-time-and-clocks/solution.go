//go:build solution

package lesson13

import "time"

func previousMonday(t time.Time) time.Time {
	// Monday is 1, so (weekday + 6) % 7 is the number of days since Monday:
	// 0 for Monday, 1 for Tuesday ... 6 for Sunday.
	daysSinceMonday := (int(t.Weekday()) + 6) % 7
	return t.AddDate(0, 0, -daysSinceMonday)
}

func isoMillis(t time.Time) string {
	return t.UTC().Format("2006-01-02T15:04:05.000Z")
}

func (r reporter) weekStart(loc *time.Location) string {
	now := time.Now
	if r.now != nil {
		now = r.now
	}
	return previousMonday(now().In(loc)).Format("2006-01-02")
}
