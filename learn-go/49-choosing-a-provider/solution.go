//go:build solution

package lesson49

func firstWithKey(names []string, key func(name string) string) string {
	for _, name := range names {
		if key(name) != "" {
			return name
		}
	}
	return ""
}
