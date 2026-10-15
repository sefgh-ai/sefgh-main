package supabaserest

import (
	"bytes"
	"encoding/json"
	"testing"
)

// Each answer was checked against postgrest-js 2.78 (PostgrestBuilder.then)
// with the same status and body.
func TestReadResultFollowsSupabaseJS(t *testing.T) {
	tests := []struct {
		name   string
		status int
		body   string
		data   any
		failed bool
	}{
		{"rows", 200, `[{"activity_date":"2026-10-14"}]`, []any{map[string]any{"activity_date": "2026-10-14"}}, false},
		{"no body", 200, ``, nil, false},
		{"byte-order mark only", 200, "\xef\xbb\xbf", nil, false},
		{"not JSON", 200, `{broken`, nil, true},
		{"206 is a success", 206, `[]`, []any{}, false},
		{"an error", 403, `{"message":"permission denied"}`, nil, true},
		{"an error that is not JSON", 500, `Bad gateway`, nil, true},
		{"an error whose body is null", 500, `null`, nil, false},
		{"an error whose body is false", 500, `false`, nil, false},
		{"an error whose body is 0", 500, `0`, nil, false},
		{"an error whose body is empty text", 500, `""`, nil, false},
		{"an error whose body is a list", 500, `[]`, nil, true},
		{"404 with a list is no rows", 404, `[]`, []any{}, false},
		{"404 with a full list is still no rows", 404, `[1,2]`, []any{}, false},
		{"404 with no body", 404, ``, nil, false},
		{"404 with an object", 404, `{"message":"not found"}`, nil, true},
		{"a redirect", 302, ``, nil, true},
	}
	for _, tt := range tests {
		data, failed := ReadResult(tt.status, []byte(tt.body))
		got, _ := json.Marshal(data)
		want, _ := json.Marshal(tt.data)
		if failed != tt.failed || !bytes.Equal(got, want) {
			t.Errorf("%s: ReadResult = %s, %v; want %s, %v", tt.name, got, failed, want, tt.failed)
		}
	}
}
