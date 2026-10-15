package githubrepos

import (
	"regexp"
	"strings"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// Checks for the values these routes place into GitHub URLs. They exist for
// safety, not to police GitHub's naming rules: a value that passes can only
// ever name one path segment, so it cannot reach a different GitHub endpoint.
//
// The Next.js handlers apply the same rules in
// src/lib/github/repo-identifiers.js, and contracts/github-repositories pins
// both. Change the two together.

const msgInvalidRepository = "Invalid repository owner or name"

var (
	// An account name: a letter or digit, then letters, digits, hyphens or
	// underscores, 39 characters at most.
	ownerPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$`)

	// A repository name: letters, digits, dots, hyphens and underscores, 100
	// characters at most.
	repoPattern = regexp.MustCompile(`^[A-Za-z0-9._-]{1,100}$`)
)

func validOwner(owner string) bool {
	return ownerPattern.MatchString(owner)
}

func validRepoName(name string) bool {
	// "." and ".." are made only of allowed characters, but in a URL they
	// mean "this folder" and "the folder above".
	return repoPattern.MatchString(name) && name != "." && name != ".."
}

// ValidOwner and ValidRepoName are the same rules for other packages, so
// every route that puts a stored name into a GitHub URL checks it the same
// way (internal/starred).
func ValidOwner(owner string) bool { return validOwner(owner) }

// ValidRepoName: see ValidOwner.
func ValidRepoName(name string) bool { return validRepoName(name) }

// encodeContentsPath turns a file path inside a repository into the form used
// in a GitHub URL. The boolean is false when the path is not acceptable.
//
// Each part between slashes is percent-encoded on its own, so a name that
// contains "#", "?" or "%" stays a name instead of changing the URL's meaning.
func encodeContentsPath(path string) (string, bool) {
	if path == "" {
		return "", true
	}
	for i := 0; i < len(path); i++ {
		// A backslash, or an ASCII control character.
		if c := path[i]; c == '\\' || c < 0x20 || c == 0x7f {
			return "", false
		}
	}
	segments := strings.Split(path, "/")
	for i, segment := range segments {
		if segment == "" || segment == "." || segment == ".." {
			return "", false
		}
		segments[i] = jscompat.EncodeURIComponent(segment)
	}
	return strings.Join(segments, "/"), true
}
