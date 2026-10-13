package parallel

import (
	"fmt"
	"reflect"
	"sync"
	"testing"
	"time"
)

func TestCollect(t *testing.T) {
	var mu sync.Mutex
	active, peak, calls := 0, 0, 0
	got := collect(6, func(i int) string {
		mu.Lock()
		active++
		calls++
		if active > peak {
			peak = active
		}
		mu.Unlock()
		time.Sleep(time.Duration(6-i) * time.Millisecond)
		mu.Lock()
		active--
		mu.Unlock()
		return fmt.Sprint(i)
	})
	if !reflect.DeepEqual(got, []string{"0", "1", "2", "3", "4", "5"}) {
		t.Errorf("ordered results: %v", got)
	}
	mu.Lock()
	defer mu.Unlock()
	if active != 0 || calls != 6 {
		t.Errorf("active=%d calls=%d, want 0 still running and 6 calls", active, calls)
	}
	// One at a time is a plain loop, and more than two breaks the limit.
	if peak != 2 {
		t.Errorf("most calls running together = %d, want exactly 2", peak)
	}
}
