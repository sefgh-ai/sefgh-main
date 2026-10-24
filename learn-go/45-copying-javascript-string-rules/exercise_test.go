package lesson45

import "testing"

// Each want is what the JavaScript expression returns for the same input.
func TestCleanPathMatchesStorageJS(t *testing.T) {
	for _, tt := range []struct{ in, want string }{
		{"uid/avatar-1.png", "uid/avatar-1.png"},
		{"uid/avatar-1.png//", "uid/avatar-1.png/"},
		{"uid/avatar-1.png///x", "uid/avatar-1.png/x"},
		{"uid/avatar-1.png////", "uid/avatar-1.png/"},
		{"/uid//a.png/", "uid/a.png"},
		{"//", ""},
		{"///", "/"},
		{"", ""},
	} {
		if got := cleanPath(tt.in); got != tt.want {
			t.Errorf("cleanPath(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
