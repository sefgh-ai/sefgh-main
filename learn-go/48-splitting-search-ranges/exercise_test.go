package lesson48

import "testing"

func TestSplitBounds(t *testing.T) {
	for _, tc := range []struct {
		low, high, left, right int64
		ok                     bool
	}{
		{0, 1, 0, 1, true}, {10, 15, 12, 13, true},
		{0, 9223372036854775807, 4611686018427387903, 4611686018427387904, true},
		{-1, 4, 0, 0, false}, {5, 4, 0, 0, false}, {4, 4, 0, 0, false},
	} {
		left, right, ok := splitBounds(tc.low, tc.high)
		if left != tc.left || right != tc.right || ok != tc.ok {
			t.Fatalf("%d..%d: got %d %d %v", tc.low, tc.high, left, right, ok)
		}
	}
}
