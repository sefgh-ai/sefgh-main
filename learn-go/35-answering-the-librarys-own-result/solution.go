//go:build solution

package lesson35

func firstNotAllowed(names []string, allowed map[string]bool) (string, bool) {
	for _, name := range names {
		if !allowed[name] {
			return name, true
		}
	}
	return "", false
}
