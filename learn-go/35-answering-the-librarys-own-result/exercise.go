//go:build !solution

package lesson35

// firstNotAllowed returns the first name in names that allowed does not
// list, and true; or "" and false when every name is allowed. names are an
// update's fields in the order they were sent.
//
// TODO:
//  1. Loop over names in order.
//  2. allowed[name] is false for a name that is not in the map: return it
//     with true.
//  3. After the loop, return "" and false.
func firstNotAllowed(names []string, allowed map[string]bool) (string, bool) {
	return "", false
}
