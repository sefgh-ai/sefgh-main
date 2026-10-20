package lesson38

import (
	"net/http"
	"testing"
)

func TestPublicSchemaOnly(t *testing.T) {
	for _, tt := range []struct {
		name    string
		headers http.Header
		want    bool
	}{
		{"default", nil, true},
		{"explicit public", http.Header{"Accept-Profile": {"public"}, "Content-Profile": {"public"}}, true},
		{"trimmed", http.Header{"Accept-Profile": {" public "}}, true},
		{"another read schema", http.Header{"Accept-Profile": {"private"}}, false},
		{"another write schema", http.Header{"Content-Profile": {"private"}}, false},
		{"empty supplied value", http.Header{"Content-Profile": {""}}, false},
		{"combined schemas", http.Header{"Accept-Profile": {"public,private"}}, false},
		{"second value", http.Header{"Content-Profile": {"public", "private"}}, false},
		{"repeated public", http.Header{"Accept-Profile": {"public", "public"}}, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := publicSchemaOnly(tt.headers); got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}
