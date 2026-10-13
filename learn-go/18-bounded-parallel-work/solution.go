//go:build solution

package parallel

import "sync"

func collect(count int, work func(int) string) []string {
	result := make([]string, count)
	slots := make(chan struct{}, 2)
	var workers sync.WaitGroup
	for i := 0; i < count; i++ {
		workers.Add(1)
		go func(index int) {
			defer workers.Done()
			slots <- struct{}{}
			defer func() { <-slots }()
			result[index] = work(index)
		}(i)
	}
	workers.Wait()
	return result
}
