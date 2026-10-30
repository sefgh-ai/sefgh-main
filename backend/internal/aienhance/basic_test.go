package aienhance

import "testing"

func TestBasicEnhancementIsIdempotent(t *testing.T) {
	for _, query := range []string{"web", "site app API", "happy capital opposite", "  language:go web  ", "web� app�", "rest mobile dashboard", "\tweb\n"} {
		once := enhanceBasic(query)
		twice := enhanceBasic(once)
		if twice != once {
			t.Errorf("repeated enhancement grew %q: %q -> %q", query, once, twice)
		}
	}
}
