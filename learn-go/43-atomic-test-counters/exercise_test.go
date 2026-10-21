package lesson43

import "testing"

func TestConcurrentCounts(t *testing.T) {
	for range 3 {
		if got := countCalls(12, 1000); got != 12000 {
			t.Fatalf("got %d; want every worker's calls", got)
		}
	}
}
func TestEmptyCounts(t *testing.T) {
	for _, input := range [][2]int{{0, 10}, {10, 0}, {-1, 10}, {10, -1}} {
		if countCalls(input[0], input[1]) != 0 {
			t.Fatal("nonpositive input must count zero")
		}
	}
}
