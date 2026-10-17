package jscompat

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

// Pieces of a Go pattern that match what JavaScript's regular expressions
// match, for patterns copied from a Next.js handler. Go's own \s leaves out
// the vertical tab and every white space beyond ASCII, and Go's . matches
// \r and the line and paragraph separators, which JavaScript's does not.
const (
	// JSSpace is the inside of a class for JavaScript's \s, to be used as
	// `[` + JSSpace + `]` or inside a larger class.
	JSSpace = `\t\n\x0B\f\r \x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}`
	// JSDot is JavaScript's . without the s flag.
	JSDot = `[^\n\r\x{2028}\x{2029}]`
)

// FindSubmatchUTF16 runs re over s as a JavaScript regular expression
// without the u flag runs: over UTF-16 units, so a character outside the
// basic plane is two units, and a count such as {11} counts units. It
// returns submatch n of the leftmost match, as UTF-16 units, which may hold
// half of such a character, as in JavaScript.
//
// Each surrogate unit stands in the text as one rune of its own, above the
// basic plane, where no other character of the converted text can be. re
// must treat those runes as it treats any other character: use JSDot and
// negated classes, not \pL or the like.
func FindSubmatchUTF16(re *regexp.Regexp, s string, n int) (UTF16, bool) {
	units := ToUTF16(s)
	var view strings.Builder
	for _, u := range units {
		if u >= 0xD800 && u <= 0xDFFF {
			view.WriteRune(rune(0x10000 + int(u)))
		} else {
			view.WriteRune(rune(u))
		}
	}
	text := view.String()
	loc := re.FindStringSubmatchIndex(text)
	if loc == nil || 2*n+1 >= len(loc) || loc[2*n] < 0 {
		return nil, false
	}
	start := utf8.RuneCountInString(text[:loc[2*n]])
	end := utf8.RuneCountInString(text[:loc[2*n+1]])
	return units[start:end], true
}
