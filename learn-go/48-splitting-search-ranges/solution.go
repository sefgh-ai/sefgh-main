//go:build solution

package lesson48

func splitBounds(low, high int64) (leftHigh, rightLow int64, ok bool) {
	if low < 0 || high <= low {
		return 0, 0, false
	}
	mid := low + (high-low)/2
	return mid, mid + 1, true
}
