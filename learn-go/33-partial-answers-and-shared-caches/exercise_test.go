package lesson33

import "testing"

func TestAnswer(t *testing.T) {
	tests := []struct {
		name            string
		complete, total int
		status          int
		cache           string
	}{
		{"every topic found", 6, 6, 200, cacheComplete},
		{"one failed", 5, 6, 200, cachePartial},
		{"only one found", 1, 6, 200, cachePartial},
		{"every topic failed", 0, 6, 502, noStore},
		{"no searches at all", 0, 0, 502, noStore},
	}
	for _, tt := range tests {
		status, cache := answer(tt.complete, tt.total)
		if status != tt.status || cache != tt.cache {
			t.Errorf("%s: answer(%d, %d) = %d, %q; want %d, %q", tt.name, tt.complete, tt.total, status, cache, tt.status, tt.cache)
		}
	}
}
