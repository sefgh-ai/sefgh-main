//go:build solution

package lesson14

import (
	"regexp"
	"strings"
)

var repoPattern = regexp.MustCompile(`^[A-Za-z0-9._-]{1,100}$`)

func validRepoName(name string) bool {
	return repoPattern.MatchString(name) && name != "." && name != ".."
}

func encodePath(path string) (string, bool) {
	if path == "" {
		return "", true
	}
	parts := strings.Split(path, "/")
	for i, part := range parts {
		if part == "" || part == "." || part == ".." {
			return "", false
		}
		parts[i] = escape(part)
	}
	return strings.Join(parts, "/"), true
}
