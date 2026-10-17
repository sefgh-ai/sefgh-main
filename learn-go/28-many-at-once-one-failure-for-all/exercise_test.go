package lesson28

import (
	"strings"
	"testing"
)

func TestSameInAnyOrder(t *testing.T) {
	recorded := []string{"GET /profiles?id=a", "GET /profiles?id=b", "HEAD /comments?parent=c1", "HEAD /comments?parent=c2"}
	tests := []struct {
		name string
		got  []string
		want bool
	}{
		{"the same order", []string{"GET /profiles?id=a", "GET /profiles?id=b", "HEAD /comments?parent=c1", "HEAD /comments?parent=c2"}, true},
		{"another order", []string{"HEAD /comments?parent=c2", "GET /profiles?id=b", "GET /profiles?id=a", "HEAD /comments?parent=c1"}, true},
		{"one missing", []string{"GET /profiles?id=a", "GET /profiles?id=b", "HEAD /comments?parent=c1"}, false},
		{"one changed", []string{"GET /profiles?id=a", "GET /profiles?id=x", "HEAD /comments?parent=c1", "HEAD /comments?parent=c2"}, false},
		{"one twice instead of two", []string{"GET /profiles?id=a", "GET /profiles?id=a", "HEAD /comments?parent=c1", "HEAD /comments?parent=c2"}, false},
		{"both empty", []string{}, false},
	}
	for _, tt := range tests {
		want := recorded
		if tt.name == "both empty" {
			want, tt.want = []string{}, true
		}
		before := append([]string(nil), tt.got...)
		if got := sameInAnyOrder(tt.got, want); got != tt.want {
			t.Errorf("%s: sameInAnyOrder = %v, want %v", tt.name, got, tt.want)
		}
		if strings.Join(tt.got, "|") != strings.Join(before, "|") {
			t.Errorf("%s: the caller's list was reordered", tt.name)
		}
	}
}
