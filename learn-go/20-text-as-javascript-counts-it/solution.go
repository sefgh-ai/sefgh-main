//go:build solution

package lesson20

import (
	"strings"
	"unicode/utf16"
)

func fallbackTitle(message string) []uint16 {
	words := strings.Split(message, " ")
	if len(words) > 4 {
		words = words[:4]
	}
	title := utf16.Encode([]rune(strings.Join(words, " ")))
	if len(title) > maxTitleUnits {
		title = append(title[:maxTitleUnits:maxTitleUnits], '.', '.', '.')
	}
	return title
}
