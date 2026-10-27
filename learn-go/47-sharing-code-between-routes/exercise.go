//go:build !solution

package lesson47

// isPublic says whether text is one JSON object whose "private" field is the
// JSON value false, as `data?.private === false` does in
// src/lib/repo/repoData.js. The rule is in README.md.
func isPublic(text []byte) bool {
	// TODO: decode text into a map of raw values, then compare the
	// "private" value's text with false.
	return false
}
