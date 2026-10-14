package aichat

import (
	"strings"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// quotes removes every ' and ", as the pattern /['"]/g does in title.replace.
var quotes = strings.NewReplacer("'", "", `"`, "")

// cleanTitle tidies the title the AI wrote: quotation marks removed, then
// trimmed as JavaScript trims. What is left may be empty; the fallback is
// not used for that.
func cleanTitle(title string) string {
	return jscompat.Trim(quotes.Replace(title))
}

// fallbackTitle is the title used when the AI gives none: the first four
// words of the message, cut to 30 characters with three dots when longer.
//
// It copies src/lib/ai/github.js exactly, including two recorded defects.
// Words are split at every single space, so repeated spaces make empty
// words. And the cut counts UTF-16 units, as JavaScript does, so it can fall
// in the middle of an emoji and keep only half of it. That is why the result
// is jscompat.UTF16: a Go string cannot hold half an emoji.
func fallbackTitle(message string) jscompat.UTF16 {
	words := strings.Split(message, " ")
	if len(words) > 4 {
		words = words[:4]
	}
	title := jscompat.ToUTF16(strings.Join(words, " "))
	if len(title) > 30 {
		title = append(title[:30:30], '.', '.', '.')
	}
	return title
}
