package jscompat

import (
	"strings"
	"unicode/utf8"
)

// DecodeUTF8 turns bytes into text exactly as JavaScript's Response.text()
// does: a leading byte-order mark is dropped, and every ill-formed sequence
// becomes one replacement character, U+FFFD.
//
// Go's own conversions answer the last part differently. strings.ToValidUTF8
// writes one replacement for a whole run of bad bytes, and ranging over a
// string writes one per bad byte. JavaScript writes one per ill-formed
// sequence, which is neither: the bytes E3 80 41 give one replacement and
// then "A".
func DecodeUTF8(b []byte) string {
	if len(b) >= 3 && b[0] == 0xEF && b[1] == 0xBB && b[2] == 0xBF {
		b = b[3:]
	}
	return decodeUTF8(b)
}

// decodeUTF8 is DecodeUTF8 without the byte-order mark rule, which is how
// JavaScript's URLSearchParams decodes a query string.
//
// It follows the decoder in the WHATWG Encoding Standard step for step.
func decodeUTF8(b []byte) string {
	if utf8.Valid(b) {
		return string(b)
	}
	var out strings.Builder
	out.Grow(len(b))

	var (
		point  rune // the code point being assembled
		needed int  // continuation bytes the current sequence still requires
		seen   int  // continuation bytes read so far
		lower  byte = 0x80
		upper  byte = 0xBF
	)
	for i := 0; i < len(b); {
		c := b[i]
		if needed == 0 {
			switch {
			case c <= 0x7F:
				out.WriteByte(c)
			case c >= 0xC2 && c <= 0xDF:
				needed, point = 1, rune(c&0x1F)
			case c >= 0xE0 && c <= 0xEF:
				// The first continuation byte has a narrower range after E0
				// and ED, which rules out overlong forms and surrogates.
				if c == 0xE0 {
					lower = 0xA0
				}
				if c == 0xED {
					upper = 0x9F
				}
				needed, point = 2, rune(c&0x0F)
			case c >= 0xF0 && c <= 0xF4:
				if c == 0xF0 {
					lower = 0x90
				}
				if c == 0xF4 {
					upper = 0x8F
				}
				needed, point = 3, rune(c&0x07)
			default:
				out.WriteRune(utf8.RuneError)
			}
			i++
			continue
		}
		if c < lower || c > upper {
			// The sequence ends here, unfinished. This byte is not consumed:
			// it is looked at again as the possible start of a new sequence.
			point, needed, seen = 0, 0, 0
			lower, upper = 0x80, 0xBF
			out.WriteRune(utf8.RuneError)
			continue
		}
		lower, upper = 0x80, 0xBF
		point = point<<6 | rune(c&0x3F)
		seen++
		i++
		if seen == needed {
			out.WriteRune(point)
			point, needed, seen = 0, 0, 0
		}
	}
	if needed != 0 {
		out.WriteRune(utf8.RuneError) // the input ended inside a sequence
	}
	return out.String()
}
