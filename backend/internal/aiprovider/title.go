package aiprovider

import "github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"

// TitleOptions are the model settings of a title request in
// src/lib/ai/github.js: a lower temperature and at most 20 tokens.
var TitleOptions = Options{Model: "gpt-4o", Temperature: 0.5, MaxTokens: 20}

// TitleMessages is the conversation that asks for a title for a chat that
// starts with firstMessage. It carries its own system message, so Generate
// does not add the application's.
//
// The message is JSON-escaped within the existing quoted prompt boundary.
func TitleMessages(firstMessage string) []Message {
	quoted, _ := jscompat.ToUTF16(firstMessage).MarshalJSON()
	escaped := string(quoted[1 : len(quoted)-1])
	return []Message{
		{Role: "system", Content: titleSystemPrompt},
		{Role: "user", Content: titleUserBefore + escaped + titleUserAfter},
	}
}
