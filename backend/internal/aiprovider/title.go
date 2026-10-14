package aiprovider

// TitleOptions are the model settings of a title request in
// src/lib/ai/github.js: a lower temperature and at most 20 tokens.
var TitleOptions = Options{Model: "gpt-4o", Temperature: 0.5, MaxTokens: 20}

// TitleMessages is the conversation that asks for a title for a chat that
// starts with firstMessage. It carries its own system message, so Generate
// does not add the application's.
//
// Recorded defect: the message is pasted between quotation marks without
// escaping any quotation marks it contains.
func TitleMessages(firstMessage string) []Message {
	return []Message{
		{Role: "system", Content: titleSystemPrompt},
		{Role: "user", Content: titleUserBefore + firstMessage + titleUserAfter},
	}
}
