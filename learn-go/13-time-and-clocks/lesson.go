package lesson13

import "time"

// reporter answers questions about "now". Its clock is a field, so a test
// can replace it with one that always returns the same moment.
type reporter struct {
	now func() time.Time // nil means time.Now
}
