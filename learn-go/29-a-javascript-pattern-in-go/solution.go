//go:build solution

package lesson29

func unitIndex(s string, byteOffset int) int {
	units := 0
	for _, r := range s[:byteOffset] {
		if r > 0xFFFF {
			units += 2
		} else {
			units++
		}
	}
	return units
}
