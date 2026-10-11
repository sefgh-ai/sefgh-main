//go:build !solution

package lesson01

const (
	defaultPerPage = 30
	maxPerPage     = 100
)

// clamp returns n limited to the range lo..hi.
//
//	clamp(5, 1, 100)   is 5
//	clamp(0, 1, 100)   is 1
//	clamp(500, 1, 100) is 100
func clamp(n, lo, hi int) int {
	// TODO: replace the line below with your code.
	return 0
}

// valueOr returns value, or fallback when value is empty.
func valueOr(value, fallback string) string {
	// TODO
	return ""
}

// perPage decides how many results to ask for. A requested size of 0 means
// "the caller did not say", so the answer is defaultPerPage. Any other size
// is limited to 1..maxPerPage. Use clamp.
func perPage(requested int) int {
	// TODO
	return 0
}
