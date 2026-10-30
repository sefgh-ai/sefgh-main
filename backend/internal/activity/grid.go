package activity

import (
	"encoding/json"
	"math"
	"strconv"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// Reply is the body of a 200 answer.
type Reply struct {
	Grid  [][]Day `json:"grid"`
	Stats Stats   `json:"stats"`
}

// Day is one square of the grid. Padding squares at the end have no date.
type Day struct {
	Date           string `json:"date"`
	Count          number `json:"count"`
	Color          string `json:"color"`
	WeekIndex      int    `json:"weekIndex"`
	DayOfWeekIndex int    `json:"dayOfWeekIndex"`
}

type Stats struct {
	MaxCount           number `json:"maxCount"`
	TotalContributions number `json:"totalContributions"`
	CurrentStreak      int    `json:"currentStreak"`
	AveragePerDay      number `json:"averagePerDay"`
	ActiveDays         int    `json:"activeDays"`
	TotalDays          int    `json:"totalDays"`
}

// number is a JavaScript number in a reply. JSON.stringify writes -0 as 0,
// and NaN and the infinities as null; Go's encoder writes "-0" and refuses
// the others. Everything else Go writes as JavaScript does.
type number float64

func (n number) MarshalJSON() ([]byte, error) {
	f := float64(n)
	switch {
	case math.IsNaN(f) || math.IsInf(f, 0):
		return []byte("null"), nil
	case f == 0:
		return []byte("0"), nil
	}
	return json.Marshal(f)
}

// dateRange is the reply's first and last day: from the Sunday on or
// before 365 days ago, to today. Every step uses the UTC calendar, the one
// the dates are written in (bug register R-057). Both keep now's time of
// day, as the JavaScript dates do.
func dateRange(now time.Time) (from, to time.Time) {
	to = now.UTC()
	from = to.AddDate(0, 0, -365)
	sinceMonday := int(from.Weekday()) // Sunday is 0 in Go too
	return from.AddDate(0, 0, -sinceMonday), to
}

// day writes a date as toISOString().split('T')[0] does.
func day(t time.Time) string { return t.Format("2006-01-02") }

// colorFor is getColorForCount(count, 25) in the Next.js handler.
func colorFor(count float64) string {
	if count == 0 {
		return "#161b22"
	}
	normalized := count / 25
	switch {
	case normalized <= 0.25:
		return "#0e4429"
	case normalized <= 0.5:
		return "#006d32"
	case normalized <= 0.75:
		return "#26a641"
	}
	return "#39d353"
}

// buildReply uses Sunday-to-Saturday weeks; statistics exclude padding.
func buildReply(from, to time.Time, counts map[string]float64, total float64) Reply {
	reply := Reply{Grid: [][]Day{}}
	var week []Day
	maxCount := 0.0
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		date := day(d)
		// activityMap[dateStr] || 0: a missing date, and a total of NaN,
		// count as 0.
		count := counts[date]
		if math.IsNaN(count) {
			count = 0
		}
		if count > maxCount {
			maxCount = count
		}
		if count > 0 {
			reply.Stats.ActiveDays++
		}
		weekday := int(d.Weekday())
		week = append(week, Day{date, number(count), colorFor(count), len(reply.Grid), weekday})
		if weekday == 6 { // Saturday ends a week
			reply.Grid = append(reply.Grid, week)
			week = nil
		}
	}
	if len(week) > 0 {
		for len(week) < 7 {
			week = append(week, Day{"", 0, colorFor(0), len(reply.Grid), len(week)})
		}
		reply.Grid = append(reply.Grid, week)
	}

	reply.Stats.MaxCount = number(maxCount)
	reply.Stats.TotalContributions = number(total)
	reply.Stats.CurrentStreak = streak(reply.Grid)
	// Count real dated days, not the padding squares.
	for _, week := range reply.Grid {
		for _, d := range week {
			if d.Date != "" {
				reply.Stats.TotalDays++
			}
		}
	}
	// parseFloat((total / totalDays).toFixed(1)). totalDays is never 0.
	average, _ := strconv.ParseFloat(jscompat.ToFixed(total/float64(reply.Stats.TotalDays), 1), 64)
	reply.Stats.AveragePerDay = number(average)
	return reply
}

// streak starts today, or yesterday while today is inactive.
func streak(grid [][]Day) int {
	days := []Day{}
	for _, week := range grid {
		for _, d := range week {
			if d.Date != "" {
				days = append(days, d)
			}
		}
	}
	n := 0
	i := len(days) - 1
	if i >= 0 && !(days[i].Count > 0) {
		i--
	}
	for ; i >= 0 && days[i].Count > 0; i-- {
		n++
	}
	return n
}
