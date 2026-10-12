package lesson02

import "testing"

func TestLookupSort(t *testing.T) {
	tests := []struct {
		name string
		want sortOption
	}{
		{"latest", sortOption{sort: "updated", order: "desc"}},
		{"featured", sortOption{sort: "stars", order: "desc"}},
		{"all", sortOption{sort: "", order: "desc"}},
		{"bogus", sortOption{sort: "", order: "desc"}},
		{"", sortOption{sort: "", order: "desc"}},
		// In JavaScript these two names found inherited properties.
		// In Go they are just names that are not in the map.
		{"constructor", sortOption{sort: "", order: "desc"}},
		{"__proto__", sortOption{sort: "", order: "desc"}},
	}
	for _, tt := range tests {
		if got := lookupSort(tt.name); got != tt.want {
			t.Errorf("lookupSort(%q) = %+v, want %+v", tt.name, got, tt.want)
		}
	}
}

func TestCountKnown(t *testing.T) {
	tests := []struct {
		names []string
		want  int
	}{
		{[]string{"all", "latest", "featured"}, 3},
		{[]string{"all", "bogus", "constructor"}, 1},
		{[]string{}, 0},
		{nil, 0},
	}
	for _, tt := range tests {
		if got := countKnown(tt.names); got != tt.want {
			t.Errorf("countKnown(%q) = %d, want %d", tt.names, got, tt.want)
		}
	}
}

func TestDescribe(t *testing.T) {
	tests := []struct {
		option sortOption
		want   string
	}{
		{sortOption{sort: "stars", order: "desc"}, "stars desc"},
		{sortOption{sort: "updated", order: "desc"}, "updated desc"},
		{sortOption{sort: "", order: "desc"}, "best match"},
	}
	for _, tt := range tests {
		if got := describe(tt.option); got != tt.want {
			t.Errorf("describe(%+v) = %q, want %q", tt.option, got, tt.want)
		}
	}
}
