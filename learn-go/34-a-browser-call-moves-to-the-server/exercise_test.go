package lesson34

import "testing"

func TestCountSources(t *testing.T) {
	tests := []struct {
		name string
		rows []any
		want Counts
	}{
		{"none", []any{}, Counts{}},
		{"one of each", []any{map[string]any{"source": "search"}, map[string]any{"source": "chat"}}, Counts{2, 1, 1}},
		{"another source counts in the total only", []any{map[string]any{"source": "api"}, map[string]any{"source": "search"}}, Counts{2, 1, 0}},
		{"no source, or not text", []any{map[string]any{}, map[string]any{"source": nil}, map[string]any{"source": 7.0}}, Counts{3, 0, 0}},
		{"not an object", []any{"search", nil, map[string]any{"source": "chat"}}, Counts{3, 0, 1}},
	}
	for _, tt := range tests {
		if got := countSources(tt.rows); got != tt.want {
			t.Errorf("%s: countSources = %+v, want %+v", tt.name, got, tt.want)
		}
	}
}
