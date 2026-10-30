package aichat

import (
	"strings"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// quotes removes every ' and ", as the pattern /['"]/g does in title.replace.
var quotes = strings.NewReplacer("'", "", `"`, "")

// cleanTitle tidies the title the AI wrote: quotation marks removed, then
// trimmed as JavaScript trims. The caller falls back if nothing remains.
func cleanTitle(title string) string {
	return jscompat.Trim(quotes.Replace(title))
}

// fallbackTitle keeps the first four whitespace-delimited words, capped at30
// Unicode code points. A rune slice cannot retain half a surrogate pair.
func fallbackTitle(message string) string {
	words := jscompat.Words(message)
	if len(words) > 4 {
		words = words[:4]
	}
	title := []rune(strings.Join(words, " "))
	if len(title) > 30 {
		return string(title[:30]) + "..."
	}
	return string(title)
}
