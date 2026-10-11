package lesson04

import (
	"errors"
	"testing"
)

func TestParsePage(t *testing.T) {
	tests := []struct {
		in      string
		want    int
		wantErr bool
	}{
		{"", 1, false},
		{"7", 7, false},
		{"1", 1, false},
		{"0", 1, false},
		{"-3", 1, false},
		{"1000", 1000, false},
		{"5000", 1000, false},
		{"abc", 0, true},
		{"2.5", 0, true},
		{"1e2", 0, true},
		{" 5", 0, true},
	}
	for _, tt := range tests {
		checkParsePage(t, tt.in, tt.want, tt.wantErr)
	}
}

// Finish TestParsePage first. These two cases need a little more.
func TestParsePageStretch(t *testing.T) {
	// strconv.Atoi accepts a leading plus sign. Our API does not.
	checkParsePage(t, "+5", 0, true)
	// Too big for an int, but still a whole number: clamp it.
	checkParsePage(t, "99999999999999999999999999", 1000, false)
	checkParsePage(t, "-99999999999999999999999999", 1, false)
}

func checkParsePage(t *testing.T, in string, want int, wantErr bool) {
	t.Helper()
	got, err := parsePage(in)
	if wantErr {
		if !errors.Is(err, errInvalidPage) {
			t.Errorf("parsePage(%q) error = %v, want errInvalidPage", in, err)
		}
		return
	}
	if err != nil {
		t.Errorf("parsePage(%q) returned an unexpected error: %v", in, err)
		return
	}
	if got != want {
		t.Errorf("parsePage(%q) = %d, want %d", in, got, want)
	}
}
