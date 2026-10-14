// Copied from the provider requests recorded in
// contracts/ai-enhance-query/cases.json, not retyped. There is no generator
// script. The contract cases compare every provider request in full, so they
// fail if this text and the Next.js handler's drift apart.

package aienhance

const (
	openAIModel        = "gpt-3.5-turbo"
	openAISystemPrompt = "You are a GitHub search query optimizer. Your task is to take a user's search query and enhance it to make it more effective for searching GitHub repositories. \n          \nRules:\n- Add relevant keywords that would help find better results\n- Use GitHub search operators when appropriate (stars:, language:, topic:, etc.)\n- Keep the query concise and focused\n- Don't change the core intent of the search\n- Return ONLY the enhanced query, nothing else\n- Don't add quotes or explanations"

	anthropicModel        = "claude-3-haiku-20240307"
	anthropicPromptBefore = "You are a GitHub search query optimizer. Enhance this search query to make it more effective for finding GitHub repositories: \""
	anthropicPromptAfter  = "\"\n          \nRules:\n- Add relevant keywords\n- Use GitHub search operators when helpful (stars:, language:, topic:)\n- Keep it concise\n- Return ONLY the enhanced query, nothing else"
)
