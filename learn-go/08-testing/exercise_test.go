package lesson08

import "testing"

// This is a table-driven test: one loop, many rows. Each row runs as its own
// named subtest, so a failure tells you exactly which row broke.
func TestEveryRowIsCorrect(t *testing.T) {
	for _, tc := range starsCases {
		t.Run(tc.in, func(t *testing.T) {
			if got := validStars(tc.in); got != tc.want {
				t.Errorf("validStars(%q) = %v, but your row says %v", tc.in, got, tc.want)
			}
		})
	}
}

func TestTableIsBigEnough(t *testing.T) {
	var accepted, rejected int
	for _, tc := range starsCases {
		if tc.want {
			accepted++
		} else {
			rejected++
		}
	}
	if len(starsCases) < 6 {
		t.Errorf("the table has %d rows, want at least 6", len(starsCases))
	}
	if accepted == 0 || rejected == 0 {
		t.Errorf("the table has %d rows expecting true and %d expecting false, want some of each", accepted, rejected)
	}
}

// A test table is only as good as the mistakes it catches. Each broken
// validator must disagree with at least one of your rows.
func TestTableCatchesEveryBrokenValidator(t *testing.T) {
	for mistake, broken := range brokenValidators {
		caught := false
		for _, tc := range starsCases {
			if broken(tc.in) != tc.want {
				caught = true
				break
			}
		}
		if !caught {
			t.Errorf("no row catches the validator that %s", mistake)
		}
	}
}
