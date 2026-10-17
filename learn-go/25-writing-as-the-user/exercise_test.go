package lesson25

import "testing"

func TestSavedBy(t *testing.T) {
	mine := map[string]any{"user_id": "user-a"}
	theirs := map[string]any{"user_id": "user-b"}
	tests := []struct {
		name      string
		rows      []any
		saved, ok bool
	}{
		{"no rows", []any{}, false, true},
		{"my row", []any{theirs, mine}, true, true},
		{"only theirs", []any{theirs}, false, true},
		{"an id that is a number is not text", []any{map[string]any{"user_id": 7}}, false, true},
		{"a row that is not an object", []any{"user-a", 42}, false, true},
		{"null before a match throws", []any{nil, mine}, false, false},
		{"a match stops before null", []any{mine, nil}, true, true},
	}
	for _, tt := range tests {
		saved, ok := savedBy(tt.rows, "user-a")
		if saved != tt.saved || ok != tt.ok {
			t.Errorf("%s: savedBy = %v, %v; want %v, %v", tt.name, saved, ok, tt.saved, tt.ok)
		}
	}
}
