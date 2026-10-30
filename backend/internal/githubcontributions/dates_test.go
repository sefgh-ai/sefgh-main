package githubcontributions

import (
	"math"
	"testing"
	"time"
	_ "time/tzdata" // so named zones load on machines without a zone database
)

// Expected values in this file were produced by Node.js 21 running the
// Next.js handler's own date arithmetic and toFixed, not written by hand.

func TestDateRange(t *testing.T) {
	tests := []struct{ now, zone, wantFrom string }{
		{"2026-10-12T09:30:15.123Z", "UTC", "2025-10-06T09:30:15.123Z"},
		{"2026-10-13T00:00:00.000Z", "UTC", "2025-10-13T00:00:00.000Z"},
		{"2024-03-01T12:00:00.000Z", "UTC", "2023-02-27T12:00:00.000Z"},
		{"2024-02-29T23:59:59.999Z", "UTC", "2023-02-27T23:59:59.999Z"},
		{"2026-01-01T00:00:00.000Z", "UTC", "2024-12-30T00:00:00.000Z"},
		// The local date is a day ahead of, or behind, the UTC date.
		{"2026-10-12T20:00:00.000Z", "Asia/Kolkata", "2025-10-06T20:00:00.000Z"},
		{"2026-10-13T02:00:00.000Z", "America/Los_Angeles", "2025-10-13T02:00:00.000Z"},
		// Daylight saving: the offset differs between the two ends.
		{"2026-03-09T16:00:00.000Z", "America/New_York", "2025-03-03T16:00:00.000Z"},
		// 02:30 did not exist 365 days earlier, so the clock time moves to 03:30.
		{"2026-03-09T06:30:00.000Z", "America/New_York", "2025-03-03T06:30:00.000Z"},
		// 01:30 happened twice 365 days earlier.
		{"2026-11-02T06:30:00.000Z", "America/New_York", "2025-10-27T06:30:00.000Z"},
		{"2026-03-30T01:30:00.000Z", "Europe/London", "2025-03-24T01:30:00.000Z"},
		{"2026-10-26T01:30:00.000Z", "Europe/London", "2025-10-20T01:30:00.000Z"},
		// A zone whose daylight saving shifts by half an hour.
		{"2026-04-06T15:45:00.000Z", "Australia/Lord_Howe", "2025-03-31T15:45:00.000Z"},
		{"2026-10-05T15:15:00.000Z", "Australia/Lord_Howe", "2025-09-29T15:15:00.000Z"},
		// An offset that is not a whole number of hours.
		{"2026-06-15T18:20:00.000Z", "Asia/Kathmandu", "2025-06-09T18:20:00.000Z"},
		{"2026-07-04T10:00:00.000Z", "Pacific/Auckland", "2025-06-30T10:00:00.000Z"},
		{"2026-09-28T13:30:00.000Z", "Pacific/Auckland", "2025-09-22T13:30:00.000Z"},
	}
	for _, tt := range tests {
		now, err := time.Parse(time.RFC3339Nano, tt.now)
		if err != nil {
			t.Fatal(err)
		}
		loc, err := time.LoadLocation(tt.zone)
		if err != nil {
			t.Fatal(err)
		}
		from, to := dateRange(now.In(loc))
		if from != tt.wantFrom {
			t.Errorf("dateRange(%s in %s) from = %s, want %s", tt.now, tt.zone, from, tt.wantFrom)
		}
		if to != tt.now {
			t.Errorf("dateRange(%s in %s) to = %s, want the same instant", tt.now, tt.zone, to)
		}
	}
}

func TestDateRangeDropsSubMilliseconds(t *testing.T) {
	now := time.Date(2026, 10, 12, 9, 30, 15, 123_999_999, time.UTC)
	from, to := dateRange(now)
	if from != "2025-10-06T09:30:15.123Z" || to != "2026-10-12T09:30:15.123Z" {
		t.Errorf("got %s, %s; a JavaScript Date holds whole milliseconds", from, to)
	}
}

func TestToFixed1(t *testing.T) {
	tests := []struct {
		total, days float64
		want        float64
	}{
		{1, 4, 0.3}, // an exact tie goes up; Go's FormatFloat would give 0.2
		{3, 4, 0.8},
		{7, 20, 0.3}, // 0.35 is stored as slightly less
		{9, 20, 0.5}, // 0.45 is stored as slightly more
		{8, 4, 2},
		{39, 20, 1.9},
		{12345, 7, 1763.6},
		{1, 30, 0},
		{0, 7, 0},
		{91, 364, 0.3}, // a real year: 91 contributions over 52 weeks
		{127, 364, 0.3},
		{455, 364, 1.3},
		{1, 3, 0.3},
		{2, 3, 0.7},
		{5, 2, 2.5},
		{1, 20, 0.1},
		{3, 20, 0.1},
		{19, 20, 0.9},
		{1, 8, 0.1},
		{3, 8, 0.4},
		{5, 8, 0.6},
		{7, 8, 0.9},
		{1000000, 3, 333333.3},
		{13, 7, 1.9},
		{9, 15, 0.6},
	}
	for _, tt := range tests {
		if got := toFixed1(tt.total / tt.days); got != tt.want {
			t.Errorf("toFixed1(%v/%v) = %v, want %v", tt.total, tt.days, got, tt.want)
		}
	}
}

func TestToFixed1Extremes(t *testing.T) {
	if got := toFixed1(-0.25); got != -0.3 {
		t.Errorf("toFixed1(-0.25) = %v, want -0.3", got)
	}
	if got := toFixed1(-0.04); got != 0 || math.Signbit(got) {
		t.Errorf("toFixed1(-0.04) = %v, want positive zero", got)
	}
	if got := toFixed1(1e21); got != 1e21 {
		t.Errorf("toFixed1(1e21) = %v, want it unchanged", got)
	}
	if got := toFixed1(math.NaN()); !math.IsNaN(got) {
		t.Errorf("toFixed1(NaN) = %v, want NaN", got)
	}
}

func TestTruthy(t *testing.T) {
	for _, v := range []any{true, 1.0, -1.0, "x", []any{}, map[string]any{}} {
		if !truthy(v) {
			t.Errorf("truthy(%#v) = false, want true", v)
		}
	}
	for _, v := range []any{nil, false, 0.0, ""} {
		if truthy(v) {
			t.Errorf("truthy(%#v) = true, want false", v)
		}
	}
}
