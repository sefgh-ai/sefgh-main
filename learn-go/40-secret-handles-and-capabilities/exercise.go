//go:build !solution

package lesson40

func take(handle *oneTimeValue) (string, bool) {
	// TODO: return the value exactly once, safely across goroutines.
	return "", false
}
