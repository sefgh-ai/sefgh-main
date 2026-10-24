package lesson46

import (
	"testing"
	"time"
)

func TestWaitSleepsTheWholeTime(t *testing.T) {
	var total time.Duration
	got := wait(60, func() bool { return false }, func(d time.Duration) { total += d })
	if got != 60 || total != 60*time.Second {
		t.Fatalf("slept %d times, %v in all", got, total)
	}
}

func TestWaitStopsBeforeTheNextSleep(t *testing.T) {
	calls := 0
	stopAfter := 3
	got := wait(60, func() bool { return calls >= stopAfter }, func(time.Duration) { calls++ })
	if got != 3 || calls != 3 {
		t.Fatalf("slept %d times, sleep called %d times", got, calls)
	}
}

func TestWaitAlreadyStopped(t *testing.T) {
	got := wait(60, func() bool { return true }, func(time.Duration) { t.Fatal("slept after stop") })
	if got != 0 {
		t.Fatal(got)
	}
}
