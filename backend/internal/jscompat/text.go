package jscompat

import "strings"

// Trim removes what JavaScript's String.prototype.trim removes. That set is
// not Go's: it includes the byte-order mark U+FEFF and leaves out U+0085,
// so strings.TrimSpace gives a different answer for a few characters.
func Trim(s string) string {
	return strings.TrimFunc(s, isJSSpace)
}

func isJSSpace(r rune) bool {
	switch r {
	case '\t', '\n', '\v', '\f', '\r', ' ', 0x00A0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF:
		return true
	}
	return r >= 0x2000 && r <= 0x200A
}

// UTF16Len is the length JavaScript reports for a string. JavaScript counts
// UTF-16 units, so a character outside the basic plane, such as an emoji,
// counts as two. len(s) in Go counts bytes, which is a third answer.
func UTF16Len(s string) int {
	n := 0
	for _, r := range s {
		if r >= 0x10000 {
			n += 2
		} else {
			n++
		}
	}
	return n
}

// ToLowerCase lower-cases as JavaScript's toLowerCase does wherever the
// result can meet plain ASCII text. The one character where Go's
// strings.ToLower would differ in that way is the dotted capital I, U+0130:
// JavaScript writes it as "i" followed by a combining dot, Go as a bare "i".
// The Greek final sigma also differs, but neither form is ASCII.
func ToLowerCase(s string) string {
	return strings.ToLower(strings.ReplaceAll(s, dottedCapitalI, smallIWithDot))
}

// Written as numbers so that no invisible character sits in this file.
var (
	dottedCapitalI = string(rune(0x0130))
	smallIWithDot  = "i" + string(rune(0x0307))
)
