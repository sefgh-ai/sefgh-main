package activity

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"os"
	"os/exec"
	"testing"
	"time"
)

// TestMatchesNodeOnGeneratedInput compares Go with an independent JavaScript
// reference for the approved R-059 behavior, through activity-run.mjs. The inputs cover what the twelve
// fixtures cannot list one by one: every weekday and both leap years, server
// time zones far from UTC, duplicate and out-of-range dates, counts that
// are null, missing, negative, fractional or too large for a double, streaks
// that end today or yesterday, and averages that fall exactly halfway.
//
// It needs Node and the repository's node_modules, as CI has; without them
// it is skipped, and says so.
func TestMatchesNodeOnGeneratedInput(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node is not installed")
	}
	if _, err := os.Stat("../../../node_modules/next"); err != nil {
		t.Skip("node_modules is missing; run npm ci in the repository root")
	}

	fixtures := generate(400)
	input, err := json.Marshal(fixtures)
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command(node, "scripts/contracts/activity-run.mjs")
	cmd.Dir = "../../.."
	cmd.Stdin = bytes.NewReader(input)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("the Node runner failed: %v\n%s", err, stderr.String())
	}
	var answers []json.RawMessage
	if err := json.Unmarshal(output, &answers); err != nil || len(answers) != len(fixtures) {
		t.Fatalf("the Node runner gave %d answers for %d inputs: %v", len(answers), len(fixtures), err)
	}

	for i, raw := range fixtures {
		encoded, _ := json.Marshal(raw)
		var f fixture
		if err := json.Unmarshal(encoded, &f); err != nil {
			t.Fatal(err)
		}
		if err := json.Unmarshal(answers[i], &f.Expect); err != nil {
			t.Fatal(err)
		}
		t.Run(f.ID, func(t *testing.T) { check(t, f) })
	}
}

// generate makes n inputs from a fixed seed, so a failure can be repeated.
func generate(n int) []map[string]any {
	rng := rand.New(rand.NewPCG(2026, 1014))
	zones := []string{"UTC", "Asia/Kolkata", "America/New_York", "Pacific/Kiritimati", "Pacific/Pago_Pago"}
	first := time.Date(2023, 12, 25, 0, 0, 0, 0, time.UTC)
	span := int64(5 * 366 * 24 * time.Hour)
	var fixtures []map[string]any
	for i := range n {
		now := first.Add(time.Duration(rng.Int64N(span))).Truncate(time.Millisecond)
		from, to := dateRange(now)
		days := int(to.Sub(from).Hours()/24) + 1
		var rows []any
		for range rng.IntN(40) {
			// Up to three days outside the range on either side.
			row := map[string]any{"activity_date": day(from.AddDate(0, 0, rng.IntN(days+6)-3))}
			switch rng.IntN(10) {
			case 0:
				row["activity_count"] = nil
			case 1: // no count at all
			case 2:
				row["activity_count"] = 0
			case 3:
				row["activity_count"] = -rng.IntN(6)
			case 4:
				row["activity_count"] = float64(rng.IntN(120)) / 8
			case 5:
				row["activity_count"] = json.Number("-0")
			default:
				row["activity_count"] = rng.IntN(40)
			}
			rows = append(rows, row)
		}
		switch {
		case i%5 == 0:
			// A streak ending today, or yesterday.
			end := rng.IntN(2)
			for k := range 1 + rng.IntN(12) {
				rows = append(rows, map[string]any{"activity_date": day(to.AddDate(0, 0, -end-k)), "activity_count": 1 + rng.IntN(5)})
			}
		case i%7 == 0:
			// An average of exactly a quarter, or three quarters: halfway
			// between two tenths, where JavaScript and Go round apart.
			total := float64(buildReply(from, to, nil, 0).Stats.TotalDays) * float64(1+2*rng.IntN(2)) / 4
			rows = []any{map[string]any{"activity_date": day(to), "activity_count": total}}
		case i%37 == 0:
			// Counts too large for a double: Infinity, then NaN.
			rows = append(rows, map[string]any{"activity_date": day(to), "activity_count": json.Number("1e400")})
			if rng.IntN(2) == 0 {
				rows = append(rows, map[string]any{"activity_date": day(to), "activity_count": json.Number("-1e400")})
			}
		}
		if rows == nil {
			rows = []any{}
		}
		fixtures = append(fixtures, map[string]any{
			"id":       fmt.Sprintf("generated-%03d", i),
			"now":      now.Format("2006-01-02T15:04:05.000Z07:00"),
			"timezone": zones[rng.IntN(len(zones))],
			"user":     map[string]any{"id": "user-a"},
			"rows":     rows,
		})
	}
	return fixtures
}
