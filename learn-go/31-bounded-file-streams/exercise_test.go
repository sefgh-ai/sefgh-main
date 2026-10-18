package lesson31

import (
	"errors"
	"strings"
	"testing"
)

type failingReader struct{ err error }

func (r failingReader) Read([]byte) (int, error) { return 0, r.err }

func TestReadBounded(t *testing.T) {
	for _, tt := range []struct {
		input   string
		maximum int64
		want    string
		large   bool
	}{{"abc", 3, "abc", false}, {"abc", 5, "abc", false}, {"abcd", 3, "", true}, {"", 0, "", false}, {"x", 0, "", true}} {
		got, large, err := readBounded(strings.NewReader(tt.input), tt.maximum)
		if err != nil || large != tt.large || string(got) != tt.want {
			t.Errorf("%q limit %d: %q %v %v", tt.input, tt.maximum, got, large, err)
		}
	}
}

func TestReadErrorIsPreserved(t *testing.T) {
	want := errors.New("disk stopped")
	_, _, err := readBounded(failingReader{want}, 10)
	if !errors.Is(err, want) {
		t.Fatalf("got %v, want %v", err, want)
	}
}

func TestReaderIsNotConsumedPastTheExtraByte(t *testing.T) {
	r := strings.NewReader("abcdefgh")
	_, _, _ = readBounded(r, 3)
	if r.Len() != 4 {
		t.Fatalf("%d bytes remain, want 4", r.Len())
	}
}
