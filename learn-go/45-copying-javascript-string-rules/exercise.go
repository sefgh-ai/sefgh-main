//go:build !solution

package lesson45

// cleanPath copies how storage-js cleans an upload path. The rule is in
// README.md.
func cleanPath(p string) string {
	// TODO: remove at most one leading and one trailing slash, then turn
	// every run of slashes into a single slash.
	return p
}
