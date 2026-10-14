package jscompat

import (
	"fmt"
	"unicode/utf16"
	"unicode/utf8"
)

// UTF16 is text held the way JavaScript holds it: as UTF-16 units. A Go
// string cannot hold one half of a surrogate pair on its own, and JavaScript
// text can: substring(0, n) leaves one when it cuts an emoji in two. Slicing
// a UTF16 value gives the same units substring gives.
type UTF16 []uint16

// ToUTF16 converts a Go string. A character outside the basic plane, such as
// an emoji, becomes two units, so len(ToUTF16(s)) == UTF16Len(s).
func ToUTF16(s string) UTF16 {
	return utf16.Encode([]rune(s))
}

// MarshalJSON writes the text as JSON.stringify does. A pair is written as
// the character it stands for. A half without its partner cannot be written
// in UTF-8, so it is written as an escape such as \ud83d, which is what
// JavaScript writes. Go's encoder would write U+FFFD there instead, and a
// browser would read a different string.
func (u UTF16) MarshalJSON() ([]byte, error) {
	out := make([]byte, 0, len(u)+2)
	out = append(out, '"')
	for i := 0; i < len(u); i++ {
		unit := rune(u[i])
		switch {
		case isHighHalf(unit) && i+1 < len(u) && isLowHalf(rune(u[i+1])):
			out = utf8.AppendRune(out, utf16.DecodeRune(unit, rune(u[i+1])))
			i++
		case isHighHalf(unit) || isLowHalf(unit):
			out = fmt.Appendf(out, `\u%04x`, unit)
		case unit == '"' || unit == '\\':
			out = append(out, '\\', byte(unit))
		case unit == '\b':
			out = append(out, `\b`...)
		case unit == '\f':
			out = append(out, `\f`...)
		case unit == '\n':
			out = append(out, `\n`...)
		case unit == '\r':
			out = append(out, `\r`...)
		case unit == '\t':
			out = append(out, `\t`...)
		case unit < 0x20:
			out = fmt.Appendf(out, `\u%04x`, unit)
		default:
			out = utf8.AppendRune(out, unit)
		}
	}
	return append(out, '"'), nil
}

func isHighHalf(unit rune) bool { return unit >= 0xD800 && unit <= 0xDBFF }
func isLowHalf(unit rune) bool  { return unit >= 0xDC00 && unit <= 0xDFFF }
