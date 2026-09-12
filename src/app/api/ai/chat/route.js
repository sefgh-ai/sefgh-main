import { generateAIResponse, generateConversationTitle } from '@/lib/ai/github'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { messages, action } = await request.json()

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Generate title if requested
    if (action === 'generate_title' && messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user')
      if (!firstUserMessage) {
        return NextResponse.json(
          { error: 'No user message found' },
          { status: 400 }
        )
      }

      const title = await generateConversationTitle(firstUserMessage.content)
      return NextResponse.json({ title })
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(messages)
    return NextResponse.json({ response: aiResponse })

  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
