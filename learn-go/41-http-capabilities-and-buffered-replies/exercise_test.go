package lesson41

import (
	"bytes"
	"errors"
	"testing"
)

func TestAppendExactlyToLimit(t *testing.T) {
	buffer := []byte("ab")
	n, err := appendBounded(&buffer, 4, []byte("cd"))
	if err != nil || n != 2 || string(buffer) != "abcd" {
		t.Fatalf("append: %d %v %q", n, err, buffer)
	}
}

func TestRefusalDoesNotPartiallyAppend(t *testing.T) {
	buffer := []byte("ab")
	before := bytes.Clone(buffer)
	n, err := appendBounded(&buffer, 4, []byte("cde"))
	if n != 0 || !errors.Is(err, errTooLarge) || !bytes.Equal(buffer, before) {
		t.Fatalf("refusal changed buffer: %d %v %q", n, err, buffer)
	}
}

func TestInvalidLimitAndEmptyChunk(t *testing.T) {
	for _, limit := range []int{-1, 1} {
		buffer := []byte("ab")
		n, err := appendBounded(&buffer, limit, nil)
		if n != 0 || !errors.Is(err, errTooLarge) || string(buffer) != "ab" {
			t.Fatalf("limit%d: %d %v %q", limit, n, err, buffer)
		}
	}
	buffer := []byte("ab")
	if n, err := appendBounded(&buffer, 2, nil); n != 0 || err != nil || string(buffer) != "ab" {
		t.Fatal("empty append", n, err, buffer)
	}
}
