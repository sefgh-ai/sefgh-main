package aichat

import (
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/ailimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// prepareMessages checks what a caller sent as messages and returns the ones
// to forward, as prepareChatMessages in src/lib/ai/guard.js does. It answers
// the messages, or the 400 error sentence and no messages.
//
// Only role and content are kept. The role must be "user" or "assistant" and
// the content text, so a caller cannot send a system message and the
// application's instructions always come first. Every message is checked,
// even one that is about to be dropped.
//
// The most recent messages are kept: at most 20, then the oldest are dropped
// until the rest hold at most 8,000 characters, counted in UTF-16 units as
// JavaScript counts them. Dropping, not refusing, is deliberate: the browser
// sends the whole conversation every time. Only a newest message that is
// itself too long is refused, because no dropping could make it fit.
func prepareMessages(value any) ([]aiprovider.Message, string) {
	list, isList := value.([]any)
	if !isList || len(list) == 0 {
		return nil, "Messages array is required"
	}
	cleaned := make([]aiprovider.Message, 0, len(list))
	for _, element := range list {
		// Anything that is not an object, null included, has no role.
		message, _ := element.(map[string]any)
		role, _ := message["role"].(string)
		content, isText := message["content"].(string)
		if (role != "user" && role != "assistant") || !isText {
			return nil, "Invalid messages"
		}
		cleaned = append(cleaned, aiprovider.Message{Role: role, Content: content})
	}

	recent := cleaned[max(0, len(cleaned)-ailimit.ChatMessages):]
	if jscompat.UTF16Len(recent[len(recent)-1].Content) > ailimit.ChatCharacters {
		return nil, "Message is too long"
	}
	total := 0
	for _, message := range recent {
		total += jscompat.UTF16Len(message.Content)
	}
	for total > ailimit.ChatCharacters {
		total -= jscompat.UTF16Len(recent[0].Content)
		recent = recent[1:]
	}
	return recent, ""
}
