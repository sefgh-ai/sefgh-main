package lesson13

import (
	"testing"
	"time"
	_ "time/tzdata" // so named time zones load on any machine
)

func mustZone(t *testing.T, name string) *time.Location {
	t.Helper()
	loc, err := time.LoadLocation(name)
	if err != nil {
		t.Fatalf("loading %s: %v", name, err)
	}
	return loc
}

func TestPreviousMonday(t *testing.T) {
	newYork := mustZone(t, "America/New_York")
	tests := []struct {
		name     string
		in, want time.Time
	}{
		{"a Monday stays", time.Date(2026, 10, 12, 9, 30, 0, 0, time.UTC), time.Date(2026, 10, 12, 9, 30, 0, 0, time.UTC)},
		{"Tuesday goes back one day", time.Date(2026, 10, 13, 9, 30, 0, 0, time.UTC), time.Date(2026, 10, 12, 9, 30, 0, 0, time.UTC)},
		{"Saturday goes back five", time.Date(2026, 10, 17, 23, 59, 59, 0, time.UTC), time.Date(2026, 10, 12, 23, 59, 59, 0, time.UTC)},
		{"Sunday goes back six, not forward one", time.Date(2026, 10, 18, 0, 0, 0, 0, time.UTC), time.Date(2026, 10, 12, 0, 0, 0, 0, time.UTC)},
		{"across the start of a month", time.Date(2026, 10, 1, 8, 0, 0, 0, time.UTC), time.Date(2026, 9, 28, 8, 0, 0, 0, time.UTC)},
		{"the clock time is kept in its own zone", time.Date(2026, 10, 15, 14, 0, 0, 0, newYork), time.Date(2026, 10, 12, 14, 0, 0, 0, newYork)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := previousMonday(tt.in)
			if !got.Equal(tt.want) {
				t.Errorf("previousMonday(%s) = %s, want %s", tt.in.Format(time.RFC3339), got.Format(time.RFC3339), tt.want.Format(time.RFC3339))
			}
		})
	}
}

func TestISOMillis(t *testing.T) {
	india := mustZone(t, "Asia/Kolkata")
	tests := []struct {
		in   time.Time
		want string
	}{
		{time.Date(2026, 10, 12, 9, 30, 15, 123_000_000, time.UTC), "2026-10-12T09:30:15.123Z"},
		{time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC), "2026-01-02T03:04:05.000Z"},
		// 01:30 in India is 20:00 the day before in UTC.
		{time.Date(2026, 10, 13, 1, 30, 0, 0, india), "2026-10-12T20:00:00.000Z"},
	}
	for _, tt := range tests {
		if got := isoMillis(tt.in); got != tt.want {
			t.Errorf("isoMillis(%s) = %q, want %q", tt.in.Format(time.RFC3339Nano), got, tt.want)
		}
	}
}

// One moment, two clocks, two different Mondays. This is the time-zone defect
// recorded in the contributions contract retired by P7-01, in miniature.
func TestWeekStartUsesTheClockItIsGiven(t *testing.T) {
	sundayEveningUTC := time.Date(2026, 10, 11, 20, 0, 0, 0, time.UTC)
	r := reporter{now: func() time.Time { return sundayEveningUTC }}

	if got, want := r.weekStart(time.UTC), "2026-10-05"; got != want {
		t.Errorf("seen from UTC it is still Sunday: weekStart = %q, want %q", got, want)
	}
	if got, want := r.weekStart(mustZone(t, "Asia/Kolkata")), "2026-10-12"; got != want {
		t.Errorf("seen from India it is already Monday: weekStart = %q, want %q", got, want)
	}
}

func TestWeekStartFallsBackToTheRealClock(t *testing.T) {
	got := reporter{}.weekStart(time.UTC) // now is nil
	monday, err := time.Parse("2006-01-02", got)
	if err != nil {
		t.Fatalf("weekStart with no clock = %q, want a date like 2026-10-12", got)
	}
	if monday.Weekday() != time.Monday {
		t.Errorf("weekStart = %s, which is a %s", got, monday.Weekday())
	}
}
