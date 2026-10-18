//go:build solution

package lesson30

func jsSlice(items []string, start int) []string {
	if start < 0 {
		start += len(items)
	}
	if start < 0 {
		start = 0
	}
	if start > len(items) {
		start = len(items)
	}
	return items[start:]
}
