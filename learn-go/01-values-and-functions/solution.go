//go:build solution

package lesson01

const (
	defaultPerPage = 30
	maxPerPage     = 100
)

func clamp(n, lo, hi int) int {
	if n < lo {
		return lo
	}
	if n > hi {
		return hi
	}
	return n
}

// The real backend writes clamp in one line with Go's built-in min and max:
//
//	return min(max(n, lo), hi)

func valueOr(value, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

func perPage(requested int) int {
	if requested == 0 {
		return defaultPerPage
	}
	return clamp(requested, 1, maxPerPage)
}
