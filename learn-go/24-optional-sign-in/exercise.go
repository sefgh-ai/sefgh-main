//go:build !solution

package lesson24

// bearer reads an Authorization header of the form "Bearer <token>". It
// returns the token and true, or "" and false when the header is missing,
// has another form, or holds an empty token or one with a space or tab.
//
// TODO:
//  1. Use strings.CutPrefix(header, "Bearer ") to get the rest and whether
//     the prefix was there. Remember to import "strings".
//  2. Without the prefix, or with an empty rest, return "", false.
//  3. If the rest contains a space or a tab (strings.ContainsAny), return
//     "", false.
//  4. Otherwise return the rest and true.
func bearer(header string) (string, bool) {
	return "", false
}
