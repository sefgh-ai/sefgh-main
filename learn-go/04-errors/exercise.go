//go:build !solution

package lesson04

// parsePage turns the text of a "page" parameter into a page number.
//
//   - ""    means the caller did not say: return 1 and no error.
//   - "7"   returns 7.
//   - "0" and "-3" are too small: return 1.
//   - "5000" is too big: return maxPage.
//   - "abc", "2.5", "1e2" and " 5" are not whole numbers:
//     return 0 and errInvalidPage.
//
// Use strconv.Atoi. It returns two values: the number, and an error that is
// nil when the text was a whole number.
func parsePage(s string) (int, error) {
	// TODO: replace the line below with your code.
	return 0, nil
}
