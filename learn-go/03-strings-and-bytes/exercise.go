//go:build !solution

package lesson03

// isUnreserved reports whether the byte c may stay as it is in a URL
// component. These may: A-Z a-z 0-9 and the nine characters - _ . ! ~ * ' ( )
func isUnreserved(c byte) bool {
	// TODO
	return false
}

// percentEncode copies s, replacing every byte that is not unreserved with
// %XX, where XX is the byte's value as two upper-case hex digits.
//
//	percentEncode("a b")  is "a%20b"
//	percentEncode("C#")   is "C%23"
//	percentEncode("é")    is "%C3%A9"   (é is two bytes in UTF-8)
func percentEncode(s string) string {
	// TODO: loop over the bytes with: for i := 0; i < len(s); i++ { c := s[i] ... }
	// Hint: the string "0123456789ABCDEF" turns a number 0..15 into a hex digit.
	return ""
}

// countCharacters returns the number of characters in s, not the number of
// bytes. countCharacters("日本") is 2, although len("日本") is 6.
func countCharacters(s string) int {
	// TODO: loop with: for range s { ... }
	return 0
}
