//go:build !solution

package lesson31

import "io"

// TODO: read through io.LimitReader, allow one extra byte to detect overflow,
// return read errors, and refuse rather than truncate oversized input.
func readBounded(reader io.Reader, maximum int64) ([]byte, bool, error) {
	return nil, false, nil
}
