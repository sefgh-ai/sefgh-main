package lesson14

import (
	"strings"
	"testing"
)

func TestValidRepoName(t *testing.T) {
	for _, name := range []string{"react", "next.js", ".github", "a..b", "my-repo_2", strings.Repeat("a", 100)} {
		if !validRepoName(name) {
			t.Errorf("validRepoName(%q) = false, want true", name)
		}
	}
	for _, name := range []string{"", ".", "..", "a/b", "../user", "a b", "a#b", "a?b", "50%", strings.Repeat("a", 101)} {
		if validRepoName(name) {
			t.Errorf("validRepoName(%q) = true, want false", name)
		}
	}
}

// The reason the rule exists: a name that passes cannot change a URL's meaning.
func TestAValidNameCannotChangeAURL(t *testing.T) {
	candidates := []string{"react", "..", "../user", "a/b", "a?ref=x", "a#b", "a%2Fb", "next.js", "a..b"}
	accepted := 0
	for _, name := range candidates {
		if !validRepoName(name) {
			continue
		}
		accepted++
		if name == "." || name == ".." || strings.ContainsAny(name, "/?#%") {
			t.Errorf("validRepoName accepted %q, which changes what a URL means", name)
		}
	}
	if accepted == 0 {
		t.Error("validRepoName accepted nothing; it should accept react, next.js and a..b")
	}
}

func TestEncodePath(t *testing.T) {
	accepted := []struct{ in, want string }{
		{"", ""},
		{"src/main.go", "src/main.go"},
		{"docs/C#/readme.md", "docs/C%23/readme.md"},
		{"notes/what?.txt", "notes/what%3F.txt"},
		{"a..b.txt", "a..b.txt"},
		{".gitignore", ".gitignore"},
	}
	for _, tt := range accepted {
		got, ok := encodePath(tt.in)
		if !ok || got != tt.want {
			t.Errorf("encodePath(%q) = %q, %v; want %q, true", tt.in, got, ok, tt.want)
		}
	}
	for _, in := range []string{"..", "a/../b", "./a", "/src", "src/", "a//b"} {
		if got, ok := encodePath(in); ok {
			t.Errorf("encodePath(%q) = %q, true; want it refused", in, got)
		}
	}
}
