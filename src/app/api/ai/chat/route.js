import { generateAIResponse, generateConversationTitle } from '@/lib/ai/github'
import { chatLimiter, prepareChatMessages, tooManyRequests } from '@/lib/ai/guard'
import { resolveSignedInUser } from '@/lib/ai/session'
import { NextResponse } from 'next/server'

// Contract version 2 (owner decisions of 2026-10-13): signed-in users only,
// a request allowance per user, checked messages, and no internal or provider
// error text in a reply. See contracts/ai-chat/README.md.
export async function POST(request) {
  try {
    const caller = await resolveSignedInUser(request)
    if (caller.status !== 200) {
      return NextResponse.json(
        { error: caller.status === 401 ? 'Sign in to use chat' : 'Sign-in could not be verified' },
        { status: caller.status }
      )
    }

    const wait = chatLimiter.take(caller.userId)
    if (wait > 0) return tooManyRequests(wait)

    const body = await request.json()
    const action = body?.action

    // Only checked { role, content } messages go any further.
    const prepared = prepareChatMessages(body?.messages)
    if (prepared.error) {
      return NextResponse.json({ error: prepared.error }, { status: 400 })
    }
    const messages = prepared.messages

    // Generate title if requested
    if (action === 'generate_title') {
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
    // The cause goes to the server log. The caller gets a fixed sentence.
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
