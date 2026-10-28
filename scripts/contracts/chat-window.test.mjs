// Phase 6 guard (BUG-025): chat says when older messages are left out
// (bug register R-014). The browser's count must be the route's own: the
// real prepareChatMessages (src/lib/ai/guard.js) is the reference.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { CHAT_WINDOW, messagesSent } = await import('../../src/lib/ai/chat-window.js');
const { AI_LIMITS, prepareChatMessages } = await import('../../src/lib/ai/guard.js');

const conversation = (lengths) => lengths.map((n, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(n) }));

test('the browser and the route share one window', () => {
  assert.equal(AI_LIMITS.chatMessages, CHAT_WINDOW.messages);
  assert.equal(AI_LIMITS.chatCharacters, CHAT_WINDOW.characters);
  assert.deepEqual(CHAT_WINDOW, { messages: 20, characters: 8000 });
});

test('messagesSent counts what prepareChatMessages forwards', () => {
  const cases = [
    [1], Array(20).fill(10), Array(21).fill(10), Array(40).fill(1),
    [8000], [8001], [7999, 1], [7999, 2], [4000, 4000, 1], [1, 8000], [3000, 3000, 3000],
  ];
  // A fixed sequence of mixed lengths, so the check is the same on every run.
  let seed = 7;
  for (let i = 0; i < 300; i++) {
    const lengths = [];
    for (let n = 1 + (i % 35); n > 0; n--) { seed = (seed * 1103515245 + 12345) % 2147483648; lengths.push(seed % 1500); }
    cases.push(lengths);
  }
  for (const lengths of cases) {
    const messages = conversation(lengths);
    const prepared = prepareChatMessages(messages);
    const want = prepared.error ? 0 : prepared.messages.length;
    assert.equal(messagesSent(messages), want, `lengths ${lengths.join(',')}`);
  }
  assert.equal(messagesSent([]), 0);
});

test('the chat list shows a note when messages are left out', async () => {
  const list = await readFile(new URL('../../src/components/chat/MessageList.jsx', import.meta.url), 'utf8');
  assert.match(list, /import \{ CHAT_WINDOW, messagesSent \} from "@\/lib\/ai\/chat-window"/);
  assert.match(list, /const sent = messagesSent\(messages\)/);
  assert.match(list, /\{sent < messages\.length && \(\s*<p role="note"/);
});
