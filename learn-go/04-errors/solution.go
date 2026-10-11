//go:build solution

package lesson04

import (
	"errors"
	"strconv"
	"strings"
)

func parsePage(s string) (int, error) {
	if s == "" {
		return 1, nil
	}
	// Stretch: Atoi accepts "+5", but our API's rule is "an optional minus
	// sign, then digits".
	if strings.HasPrefix(s, "+") {
		return 0, errInvalidPage
	}
	n, err := strconv.Atoi(s)
	// Stretch: a number too big for an int is still a whole number. Atoi
	// reports strconv.ErrRange and returns the largest (or smallest) int,
	// which the clamp below handles like any other out-of-range page.
	if err != nil && !errors.Is(err, strconv.ErrRange) {
		return 0, errInvalidPage
	}
	return min(max(n, 1), maxPage), nil
}
