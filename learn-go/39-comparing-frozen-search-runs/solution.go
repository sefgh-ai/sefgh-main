//go:build solution

package lesson39

func recallAtK(hits, relevant []string, k int) float64 {
	if k <= 0 {
		return 0
	}
	wanted := map[string]bool{}
	for _, id := range relevant {
		wanted[id] = true
	}
	if len(wanted) == 0 {
		return 0
	}
	seen := map[string]bool{}
	found := 0
	for _, id := range hits[:min(k, len(hits))] {
		if wanted[id] && !seen[id] {
			found++
		}
		seen[id] = true
	}
	return float64(found) / float64(len(wanted))
}
