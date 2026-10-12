//go:build solution

package lesson10

import "time"

func (c *cache) state(key string, now time.Time) string {
	c.mu.Lock()
	defer c.mu.Unlock()
	saved, found := c.saved[key]
	if !found {
		return "miss"
	}
	if now.Sub(saved) < time.Hour {
		return "fresh"
	}
	return "stale"
}
