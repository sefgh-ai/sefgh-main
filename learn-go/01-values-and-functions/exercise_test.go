package lesson01

import "testing"

func TestClamp(t *testing.T) {
	tests := []struct{ n, lo, hi, want int }{
		{5, 1, 100, 5},
		{0, 1, 100, 1},
		{-3, 1, 100, 1},
		{500, 1, 100, 100},
		{1, 1, 100, 1},
		{100, 1, 100, 100},
		{1001, 1, 1000, 1000},
	}
	for _, tt := range tests {
		if got := clamp(tt.n, tt.lo, tt.hi); got != tt.want {
			t.Errorf("clamp(%d, %d, %d) = %d, want %d", tt.n, tt.lo, tt.hi, got, tt.want)
		}
	}
}

func TestValueOr(t *testing.T) {
	tests := []struct{ value, fallback, want string }{
		{"latest", "all", "latest"},
		{"", "all", "all"},
		{"", "", ""},
	}
	for _, tt := range tests {
		if got := valueOr(tt.value, tt.fallback); got != tt.want {
			t.Errorf("valueOr(%q, %q) = %q, want %q", tt.value, tt.fallback, got, tt.want)
		}
	}
}

func TestPerPage(t *testing.T) {
	tests := []struct{ requested, want int }{
		{0, 30},
		{12, 12},
		{500, 100},
		{-4, 1},
	}
	for _, tt := range tests {
		if got := perPage(tt.requested); got != tt.want {
			t.Errorf("perPage(%d) = %d, want %d", tt.requested, got, tt.want)
		}
	}
}
