/**
 * GitHub AI Model Integration
 * Uses GitHub Models API for AI chat responses
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const API_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions'

/**
 * Generate AI response using GitHub Models
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Additional options (model, temperature, etc.)
 * @returns {Promise<string>} - AI response text
 */
export async function generateAIResponse(messages, options = {}) {
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    max_tokens = 1000,
  } = options

  // Add system message with repo suggestion instructions if not present
  const systemMessage = {
    role: 'system',
    content: `You are SEFGH AI, a helpful assistant for GitHub repository search and discovery. 

When suggesting GitHub repositories, you can use TWO methods:

1. **For specific recommendations**: Use a repos-json code block:
\`\`\`repos-json
[
  {
    "full_name": "owner/repo",
    "description": "Brief description",
    "stargazers_count": 50000,
    "forks_count": 10000,
    "language": "JavaScript",
    "html_url": "https://github.com/owner/repo"
  }
]
\`\`\`

2. **For quick mentions**: Just include the GitHub URL in your response and it will be auto-enhanced.

Use repo suggestions when users ask about:
- Finding repositories for specific technologies
- Learning resources
- Project examples
- Popular libraries/frameworks

Keep your explanations concise and helpful.`
  }

  // Check if messages already has a system message
  const hasSystemMessage = messages.some(m => m.role === 'system')
  const finalMessages = hasSystemMessage ? messages : [systemMessage, ...messages]

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        temperature,
        max_tokens,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GitHub AI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('Error generating AI response:', error)
    throw error
  }
}

/**
 * Generate a title for the conversation based on the first message
 * @param {string} firstMessage - The first user message
 * @returns {Promise<string>} - Generated title
 */
export async function generateConversationTitle(firstMessage) {
  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that generates short, concise titles for conversations. Generate a title that is 3-6 words long based on the user\'s first message. Return ONLY the title, nothing else.',
      },
      {
        role: 'user',
        content: `Generate a short title for a conversation that starts with: "${firstMessage}"`,
      },
    ]

    const title = await generateAIResponse(messages, {
      model: 'gpt-4o',
      temperature: 0.5,
      max_tokens: 20,
    })

    // Clean up the title (remove quotes, extra spaces, etc.)
    return title.replace(/['"]/g, '').trim()
  } catch (error) {
    console.error('Error generating title:', error)
    // Fallback to a simple title based on first words
    const words = firstMessage.split(' ').slice(0, 4).join(' ')
    return words.length > 30 ? words.substring(0, 30) + '...' : words
  }
}

/**
 * Stream AI response (for future implementation)
 * @param {Array} messages - Array of message objects
 * @param {Function} onChunk - Callback for each chunk
 */
export async function streamAIResponse(messages, onChunk) {
  // Future implementation for streaming responses
  // This would use Server-Sent Events (SSE) or WebSockets
  throw new Error('Streaming not yet implemented')
}
