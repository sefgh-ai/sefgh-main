package lesson40

import (
	"sync"
	"sync/atomic"
	"testing"
)

func newValue(text string) *oneTimeValue { return &oneTimeValue{state: &valueState{value: text}} }

func TestTakeOnce(t *testing.T) {
	handle := newValue("synthetic-example")
	if value, ok := take(handle); !ok || value != "synthetic-example" {
		t.Fatalf("first take: %q %v", value, ok)
	}
	if value, ok := take(handle); ok || value != "" {
		t.Fatal("second take revealed")
	}
	if value, ok := take(nil); ok || value != "" {
		t.Fatal("nil handle revealed")
	}
}
func TestConcurrentTake(t *testing.T) {
	handle := newValue("synthetic-example")
	var successes atomic.Int32
	var wg sync.WaitGroup
	for range 32 {
		wg.Go(func() {
			value, ok := take(handle)
			if ok {
				if value != "synthetic-example" {
					t.Error("wrong value")
				}
				successes.Add(1)
			} else if value != "" {
				t.Error("denial returned a value")
			}
		})
	}
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatalf("revealed %d times", successes.Load())
	}
}

func TestCopiedHandleSharesRevealState(t *testing.T) {
	handle := newValue("synthetic-example")
	copyValue := *handle
	if _, ok := take(handle); !ok {
		t.Fatal("first take failed")
	}
	if value, ok := take(&copyValue); ok || value != "" {
		t.Fatal("copy created another reveal")
	}
	if value, ok := take(&oneTimeValue{}); ok || value != "" {
		t.Fatal("zero handle revealed")
	}
}
