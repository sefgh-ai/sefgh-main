//go:build !solution

package lesson29

// unitIndex is the position JavaScript gives for the place byteOffset
// points to in s: the number of UTF-16 units before it. byteOffset is what
// Go's regexp answers, such as FindStringIndex's start; it always falls
// between two characters.
//
// TODO:
//  1. Keep a count of units, starting at 0.
//  2. Loop over the text before the offset, s[:byteOffset], with
//     for _, r := range ... (a range over a string gives runes; lesson 20).
//  3. A rune above 0xFFFF takes two UTF-16 units (an emoji, say); any other
//     takes one.
//  4. Return the count.
func unitIndex(s string, byteOffset int) int {
	return 0
}
