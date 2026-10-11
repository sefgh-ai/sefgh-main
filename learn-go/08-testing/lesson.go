package lesson08

import "regexp"

// starsCase is one row of a test table: an input and the expected answer.
type starsCase struct {
	in   string
	want bool
}

var starsPattern = regexp.MustCompile(`^(\*|[0-9]+|[0-9]+\.\.[0-9]+|[<>]=?[0-9]+)$`)

// validStars is the real rule for the "stars" filter, copied from
// backend/internal/githubsearch/request.go. It accepts:
//
//   - "*", meaning any number of stars
//   - "100", exactly 100
//   - "10..50", from 10 to 50
//   - ">100", ">=100", "<100" and "<=100"
func validStars(s string) bool {
	return starsPattern.MatchString(s)
}

// brokenValidators are three versions of validStars with a mistake in each.
// A good test table catches all of them.
var brokenValidators = map[string]func(string) bool{
	"forgot the ^ and $ anchors":          regexp.MustCompile(`(\*|[0-9]+|[0-9]+\.\.[0-9]+|[<>]=?[0-9]+)`).MatchString,
	"forgot ranges like 10..50":           regexp.MustCompile(`^(\*|[0-9]+|[<>]=?[0-9]+)$`).MatchString,
	"accepts a comparison with no number": regexp.MustCompile(`^(\*|[0-9]+|[0-9]+\.\.[0-9]+|[<>]=?[0-9]*)$`).MatchString,
}
