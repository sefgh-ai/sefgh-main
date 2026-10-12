//go:build !solution

package lesson13

import "time"

// previousMonday returns t moved back to the most recent Monday, with the
// same time of day. A time that is already on a Monday is returned unchanged.
func previousMonday(t time.Time) time.Time {
	// TODO: t.Weekday() is 0 for Sunday, 1 for Monday ... 6 for Saturday.
	// t.AddDate(0, 0, -n) moves back n calendar days.
	return time.Time{}
}

// isoMillis writes t the way JavaScript's toISOString does:
// "2026-10-12T09:30:15.123Z", always in UTC.
func isoMillis(t time.Time) string {
	// TODO: convert to UTC, then Format with the layout "2006-01-02T15:04:05.000Z".
	return ""
}

// weekStart returns the Monday of the current week as "2006-01-02", as a
// clock in loc sees it. It asks r.now for the time, or time.Now when r.now
// is nil.
func (r reporter) weekStart(loc *time.Location) string {
	// TODO: pick the clock, read it In(loc), then use previousMonday.
	return ""
}
