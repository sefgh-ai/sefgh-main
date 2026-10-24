//go:build solution

package lesson46

import "time"

func wait(seconds int, stopped func() bool, sleep func(time.Duration)) int {
	slept := 0
	for i := seconds; i > 0; i-- {
		if stopped() {
			break
		}
		sleep(time.Second)
		slept++
	}
	return slept
}
