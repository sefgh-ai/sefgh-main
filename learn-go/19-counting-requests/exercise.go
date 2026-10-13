//go:build !solution

package lesson19

import "time"

// allow reports whether key may make a request at the moment now, and
// records the request if so. A refused request is not recorded.
//
// TODO:
//  1. Lock c.mu, and unlock it when the function returns (use defer).
//  2. Keep only the times for key that are after now.Add(-c.window).
//  3. If c.limit of them remain, return false.
//  4. Otherwise add now to them and return true.
func (c *counter) allow(key string, now time.Time) bool {
	return false
}
