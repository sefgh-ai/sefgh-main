package lesson49

import "testing"

func TestFirstWithKey(t *testing.T) {
	keys := map[string]string{"gemini": "k", "groq": "q"}
	lookup := func(name string) string { return keys[name] }
	for _, tc := range []struct {
		names []string
		want  string
	}{
		{[]string{"github", "gemini", "groq"}, "gemini"},
		{[]string{"groq", "gemini"}, "groq"},
		{[]string{"github", "openrouter"}, ""},
		{nil, ""},
	} {
		if got := firstWithKey(tc.names, lookup); got != tc.want {
			t.Errorf("%v: got %q, want %q", tc.names, got, tc.want)
		}
	}
}
