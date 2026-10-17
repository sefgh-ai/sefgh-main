//go:build !solution

package lesson28

// sameInAnyOrder reports whether got and want hold the same requests, each
// as many times, whatever their order. It must not reorder the caller's
// lists.
//
// TODO:
//  1. Different lengths: return false.
//  2. Copy each list (append([]string(nil), got...)), so the caller's lists
//     keep their order.
//  3. Sort both copies with sort.Strings. Remember to import "sort".
//  4. Compare them item by item; return false at the first difference.
//  5. Return true.
func sameInAnyOrder(got, want []string) bool {
	return false
}
