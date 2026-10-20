package lesson39

import "testing"

func TestRecallAtK(t *testing.T) {
	for _, tt := range []struct {
		name           string
		hits, relevant []string
		k              int
		want           float64
	}{
		{"half", []string{"a", "b"}, []string{"a", "c"}, 2, 0.5},
		{"below cutoff", []string{"x", "a"}, []string{"a"}, 1, 0},
		{"duplicate hits", []string{"a", "a"}, []string{"a", "b"}, 2, 0.5},
		{"duplicate judgments", []string{"a"}, []string{"a", "a"}, 5, 1},
		{"no judgments", []string{"a"}, nil, 5, 0},
		{"no results", nil, []string{"a"}, 5, 0},
		{"zero k", []string{"a"}, []string{"a"}, 0, 0},
		{"negative k", []string{"a"}, []string{"a"}, -1, 0},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := recallAtK(tt.hits, tt.relevant, tt.k); got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}
