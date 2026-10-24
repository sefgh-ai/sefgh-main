//go:build solution

package lesson45

import "strings"

func cleanPath(p string) string {
	p = strings.TrimSuffix(strings.TrimPrefix(p, "/"), "/")
	for strings.Contains(p, "//") {
		p = strings.ReplaceAll(p, "//", "/")
	}
	return p
}
