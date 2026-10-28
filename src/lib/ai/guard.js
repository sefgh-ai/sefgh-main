import { NextResponse } from 'next/server'
import { CHAT_WINDOW } from '@/lib/ai/chat-window'

// Limits the owner approved on 2026-10-13. They are starting values, to be
// adjusted from real use. "Characters" are JavaScript string lengths, which
// count UTF-16 units; the Go backend counts the same way. The chat window is
// shared with the browser, which says when older messages are left out.
export const AI_LIMITS = {
  requests: 30,
  windowMs: 5 * 60 * 1000,
  chatMessages: CHAT_WINDOW.messages,
  chatCharacters: CHAT_WINDOW.characters,
  queryCharacters: 500,
}

/**
 * Counts requests per key inside a moving window.
 *
 * The count lives in this server process. Another instance has its own, and
 * a restart forgets it, so this slows a caller down; it is not an account
 * balance. A shared counter needs a store and is a later step.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 10000 }) {
  const seen = new Map() // key -> request times in ms, oldest first
  return {
    // Records one request and returns 0, or refuses it and returns how many
    // seconds the caller should wait.
    take(key, now = Date.now()) {
      const times = (seen.get(key) || []).filter((time) => time > now - windowMs)
      // Re-inserting moves the key to the end, so the first key is always
      // the one unused for longest.
      seen.delete(key)
      if (times.length >= limit) {
        seen.set(key, times)
        return Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000))
      }
      times.push(now)
      seen.set(key, times)
      if (seen.size > maxKeys) seen.delete(seen.keys().next().value)
      return 0
    },
    reset() {
      seen.clear()
    },
  }
}

// One allowance per signed-in user for chat, and one per address shared by
// the two search-box helpers.
export const chatLimiter = createRateLimiter({ limit: AI_LIMITS.requests, windowMs: AI_LIMITS.windowMs })
export const searchLimiter = createRateLimiter({ limit: AI_LIMITS.requests, windowMs: AI_LIMITS.windowMs })

// The address the hosting platform reports for the caller. It is only as
// trustworthy as the proxy in front of this server.
export function clientAddress(request) {
  const first = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  return first || 'unknown'
}

export function tooManyRequests(seconds) {
  return NextResponse.json(
    { error: 'Too many requests, please try again shortly' },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  )
}

/**
 * Checks the messages a caller sent to chat and returns the ones to forward.
 *
 * Only { role, content } is kept, role must be "user" or "assistant" and
 * content must be text. A caller cannot send a system message, so the
 * application's own instructions always come first. The most recent messages
 * are kept, up to the limits; older ones are dropped, not refused, so a long
 * conversation keeps working.
 *
 * Returns { messages } or { error }.
 */
export function prepareChatMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return { error: 'Messages array is required' }
  const cleaned = []
  for (const message of messages) {
    const allowedRole = message?.role === 'user' || message?.role === 'assistant'
    if (!allowedRole || typeof message.content !== 'string') return { error: 'Invalid messages' }
    cleaned.push({ role: message.role, content: message.content })
  }
  const recent = cleaned.slice(-AI_LIMITS.chatMessages)
  if (recent[recent.length - 1].content.length > AI_LIMITS.chatCharacters) return { error: 'Message is too long' }
  let total = recent.reduce((sum, message) => sum + message.content.length, 0)
  while (total > AI_LIMITS.chatCharacters) total -= recent.shift().content.length
  return { messages: recent }
}
