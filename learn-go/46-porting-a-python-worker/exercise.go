//go:build !solution

package lesson46

import "time"

// wait sleeps one second at a time, up to seconds, checking stopped before
// each sleep. It returns the number of seconds slept.
func wait(seconds int, stopped func() bool, sleep func(time.Duration)) int {
	// TODO: loop, check stopped, sleep one second, count.
	return 0
}
