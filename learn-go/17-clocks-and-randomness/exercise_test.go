package clocks

import (
	"testing"
	"time"
	_ "time/tzdata"
)

func TestPreviousDay(t *testing.T) {
	for _, tc := range []struct{ zone, instant, want string }{
		{"UTC", "2026-01-01T12:00:00Z", "2025-12-31"},
		{"UTC", "2026-03-08T23:30:00Z", "2026-03-07"},
		{"America/New_York", "2026-03-08T23:30:00Z", "2026-03-08"},
	} {
		location, err := time.LoadLocation(tc.zone)
		if err != nil {
			t.Fatal(err)
		}
		instant, err := time.Parse(time.RFC3339, tc.instant)
		if err != nil {
			t.Fatal(err)
		}
		calls := 0
		got := previousDay(func() time.Time { calls++; return instant.In(location) })
		if got != tc.want || calls != 1 {
			t.Errorf("%s: got %q calls=%d; want %q calls=1", tc.zone, got, calls, tc.want)
		}
	}
}
