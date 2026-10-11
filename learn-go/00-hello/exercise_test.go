package main

import "testing"

func TestGreeting(t *testing.T) {
	tests := []struct{ name, want string }{
		{"SEFGH", "Hello, SEFGH!"},
		{"Go", "Hello, Go!"},
		{"", "Hello, stranger!"},
	}
	for _, tt := range tests {
		if got := greeting(tt.name); got != tt.want {
			t.Errorf("greeting(%q) = %q, want %q", tt.name, got, tt.want)
		}
	}
}
