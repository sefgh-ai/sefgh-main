//go:build !solution

package lesson20

// fallbackTitle is the title used when the AI gives none: the first four
// words of message, cut to maxTitleUnits UTF-16 units with three dots when
// longer.
//
// TODO:
//  1. Split message at every single space (strings.Split), keep at most the
//     first four pieces, and join them again with single spaces.
//  2. Convert the text to UTF-16 units: utf16.Encode([]rune(text)).
//  3. If there are more than maxTitleUnits units, keep the first
//     maxTitleUnits and append three '.' units.
func fallbackTitle(message string) []uint16 {
	return nil
}
