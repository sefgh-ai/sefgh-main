//go:build solution

package lesson19

import "time"

func (c *counter) allow(key string, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	cutoff := now.Add(-c.window)
	kept := c.times[key][:0]
	for _, at := range c.times[key] {
		if at.After(cutoff) {
			kept = append(kept, at)
		}
	}
	if len(kept) >= c.limit {
		c.times[key] = kept
		return false
	}
	c.times[key] = append(kept, now)
	return true
}
