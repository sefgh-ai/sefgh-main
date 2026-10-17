package jscompat

import (
	"encoding/json"
	"testing"
	"time"
)

// Each answer was produced by new Date(ms).toISOString() in Node 21.
func TestISOString(t *testing.T) {
	tests := []struct {
		ms   int64
		want string
	}{
		{1792229400000, "2026-10-17T09:30:00.000Z"},
		{1792229400007, "2026-10-17T09:30:00.007Z"},
		{-1, "1969-12-31T23:59:59.999Z"},
		{253402300800000, "+010000-01-01T00:00:00.000Z"},
		{-62198755200000, "-000001-01-01T00:00:00.000Z"},
	}
	for _, tt := range tests {
		if got := ISOString(time.UnixMilli(tt.ms)); got != tt.want {
			t.Errorf("ISOString(%d) = %q, want %q", tt.ms, got, tt.want)
		}
	}
	// A time in another zone is written in UTC; nanoseconds are cut, not
	// rounded, as a JavaScript Date holds only milliseconds.
	india := time.FixedZone("IST", 5*3600+1800)
	moment := time.Date(2026, 10, 17, 15, 0, 0, 999_999_999, india)
	if got := ISOString(moment); got != "2026-10-17T09:30:00.999Z" {
		t.Errorf("ISOString(%v) = %q", moment, got)
	}
}

// What `const { a } = JSON.parse(text)` gives, from Node 21: a field of an
// object (the last of a repeated name), nothing for other values, and a
// throw for null and for text that is not JSON.
func TestRequestFields(t *testing.T) {
	tests := []struct {
		body string
		a    string // the raw JSON of a, or "" when undefined
		ok   bool
	}{
		{`{"a":"octo/demo"}`, `"octo/demo"`, true},
		{`{"a":1,"a":2}`, `2`, true},
		{`{}`, ``, true},
		{`[]`, ``, true},
		{`"x"`, ``, true},
		{`1`, ``, true},
		{`true`, ``, true},
		{`null`, ``, false},
		{`{broken`, ``, false},
		{``, ``, false},
	}
	for _, tt := range tests {
		fields, ok := RequestFields([]byte(tt.body))
		if ok != tt.ok || string(fields["a"]) != tt.a {
			t.Errorf("RequestFields(%q) = a %q, ok %v; want %q, %v", tt.body, fields["a"], ok, tt.a, tt.ok)
		}
	}
}

func TestTruthyJSON(t *testing.T) {
	for raw, want := range map[string]bool{
		`"x"`: true, `""`: false, `0`: false, `-0`: false, `1e-400`: false, `1e400`: true,
		`null`: false, `false`: false, `true`: true, `[]`: true, `{}`: true,
	} {
		if got := TruthyJSON(json.RawMessage(raw)); got != want {
			t.Errorf("TruthyJSON(%s) = %v, want %v", raw, got, want)
		}
	}
	if TruthyJSON(nil) {
		t.Error("a missing field (undefined) is not truthy")
	}
}
