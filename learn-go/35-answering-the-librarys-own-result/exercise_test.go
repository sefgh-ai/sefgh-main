package lesson35

import "testing"

func TestFirstNotAllowed(t *testing.T) {
	tests := []struct {
		name  string
		names []string
		want  string
		found bool
	}{
		{"all allowed", []string{"role", "current_step"}, "", false},
		{"none at all", nil, "", false},
		{"one not allowed", []string{"role", "is_admin"}, "is_admin", true},
		{"the first of two", []string{"user_id", "role", "is_admin"}, "user_id", true},
		{"a listed field set to false is not allowed", []string{"skipped"}, "skipped", true},
	}
	allowed := map[string]bool{}
	for name, ok := range writable {
		allowed[name] = ok
	}
	allowed["skipped"] = false
	for _, tt := range tests {
		got, found := firstNotAllowed(tt.names, allowed)
		if got != tt.want || found != tt.found {
			t.Errorf("%s: firstNotAllowed(%q) = %q, %v; want %q, %v", tt.name, tt.names, got, found, tt.want, tt.found)
		}
	}
}
