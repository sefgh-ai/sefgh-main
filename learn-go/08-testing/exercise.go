//go:build !solution

package lesson08

// starsCases is your test table for validStars in lesson.go.
//
// Add rows until the tests pass. They ask for three things:
//   - at least six rows, some expecting true and some expecting false
//   - every row is correct
//   - together the rows catch all three broken validators in lesson.go
var starsCases = []starsCase{
	{in: ">100", want: true},
	// TODO: add more rows.
}
