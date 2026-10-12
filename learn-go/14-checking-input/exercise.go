//go:build !solution

package lesson14

import "regexp"

// repoPattern describes a repository name: letters, digits, dots, hyphens
// and underscores, from 1 to 100 characters.
//
// TODO: replace the pattern. As written it accepts only an empty name.
// Remember ^ at the start and $ at the end.
var repoPattern = regexp.MustCompile(`^$`)

// validRepoName reports whether name is safe to place in a GitHub URL as a
// repository name. "." and ".." match the pattern but must be refused.
func validRepoName(name string) bool {
	// TODO: use repoPattern.MatchString, then rule out "." and "..".
	return false
}

// encodePath turns a file path such as "docs/C#/readme.md" into
// "docs/C%23/readme.md". The boolean is false when the path contains an
// empty part, "." or "..". An empty path is fine and stays empty.
func encodePath(path string) (string, bool) {
	// TODO: strings.Split(path, "/") gives the parts and strings.Join puts
	// them back. Encode each part with escape from lesson.go. You will need
	// to import "strings".
	return "", false
}
