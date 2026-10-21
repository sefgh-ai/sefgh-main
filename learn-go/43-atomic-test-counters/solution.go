//go:build solution

package lesson43

import (
	"sync"
	"sync/atomic"
)

func countCalls(workers, each int) int64 {
	if workers <= 0 || each <= 0 {
		return 0
	}
	var counter atomic.Int64
	var group sync.WaitGroup
	for range workers {
		group.Add(1)
		go func(c *atomic.Int64) {
			defer group.Done()
			for range each {
				c.Add(1)
			}
		}(&counter)
	}
	group.Wait()
	return counter.Load()
}
