//go:build !solution

package parallel

// collect runs work for indices [0,count), with at most two calls at once.
// TODO: wait for all work and return strings in input-index order.
func collect(count int, work func(int) string) []string {
	return nil
}
