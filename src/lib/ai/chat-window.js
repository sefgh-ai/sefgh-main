// What chat sends to the model (bug register R-014). The browser sends the
// whole conversation; the chat route keeps the newest messages within these
// limits and drops the older ones (prepareChatMessages in src/lib/ai/guard.js,
// and backend/internal/aichat in Go). The owner approved the limits on
// 2026-10-13. Lengths are JavaScript string lengths (UTF-16 units), as there.
export const CHAT_WINDOW = { messages: 20, characters: 8000 };

/**
 * How many of the newest messages the chat route forwards: the newest 20,
 * then fewer while they hold more than 8,000 characters. 0 when the newest
 * message alone is longer than that, which the route refuses.
 *
 * @param {{ content: unknown }[]} messages the conversation, oldest first
 */
export function messagesSent(messages) {
  const recent = messages.slice(-CHAT_WINDOW.messages);
  const length = (message) => (typeof message?.content === 'string' ? message.content.length : 0);
  if (recent.length === 0 || length(recent[recent.length - 1]) > CHAT_WINDOW.characters) return 0;
  let total = recent.reduce((sum, message) => sum + length(message), 0);
  let dropped = 0;
  while (total > CHAT_WINDOW.characters) total -= length(recent[dropped++]);
  return recent.length - dropped;
}
