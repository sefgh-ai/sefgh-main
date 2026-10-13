package access

import "testing"

func TestSameAccount(t *testing.T) {
	for _, tc := range []struct {
		provider string
		id       int64
		want     bool
	}{
		{"101", 101, true}, {"102", 101, false}, {"0101", 101, false},
		{"", 101, false}, {"0", 0, false}, {"-1", -1, false},
	} {
		if got := sameAccount(tc.provider, tc.id); got != tc.want {
			t.Errorf("sameAccount(%q,%d)=%t want %t", tc.provider, tc.id, got, tc.want)
		}
	}
}
