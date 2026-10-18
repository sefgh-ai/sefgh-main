//go:build !solution

package lesson30

// jsSlice is JavaScript's items.slice(start): the items from start to the
// end. A negative start counts back from the end. It never fails: a start
// past the end gives an empty list, and one before the beginning gives the
// whole list. It must not change the caller's slice.
//
// TODO:
//  1. If start is negative, add len(items) to it (so -1 is the last item).
//  2. If start is still negative, use 0.
//  3. If start is past the end, use len(items).
//  4. Return items[start:].
func jsSlice(items []string, start int) []string {
	return nil
}
