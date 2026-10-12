//go:build !solution

package lesson10

import "time"

func (c *cache) state(key string, now time.Time) string {
	// TODO: Lock the map and classify the entry as miss, fresh or stale.
	return ""
}
