// Phase 6 guard (BUG-006): the first message of a chat asks for the answer
// at once, not after the chat's name (bug register R-009). The real
// handleSend runs with stand-ins for React, Supabase and the chat route.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
register('./chat-stub-loader.mjs', import.meta.url);

const events = [];
let answerTitle;
globalThis.__chat = {
  // useState order in the hook: messages, input, then the rest.
  hook: { next: 0, values: { 0: [], 1: 'how do I parse JSON in Go?' } },
  toast: (...a) => events.push(`toast ${a[0]}`),
  createMessage: (role, content) => ({ id: `${role}-1`, role, content }),
  addMessage: async (id, userId, msg) => { events.push(`saved ${msg.role}`); },
  updateConversationTitle: async (id, userId, title) => { events.push(`named ${title}`); },
  postChat: (body) => {
    if (body.action === 'generate_title') {
      events.push('asked for name');
      return new Promise((resolve) => { answerTitle = () => resolve(Response.json({ title: 'Parsing JSON' })); });
    }
    events.push('asked for answer');
    return Promise.resolve(Response.json({ response: 'Use encoding/json.' }));
  },
};

const { useChatMessages } = await import('../../src/hooks/chat/useChatMessages.js');

test('the answer does not wait for the name, and the list waits for both', async () => {
  const refresh = async () => events.push('list reloaded');
  const chat = useChatMessages({ id: 'u1' }, null, refresh);
  const sent = chat.handleSend('SEFGH V1', { id: 'c1' }, () => {}, () => {}, []);

  // Let every settled promise run. The name request is still unanswered.
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ['saved user', 'asked for name', 'asked for answer', 'saved assistant']);

  answerTitle();
  await sent;
  assert.deepEqual(events.slice(4), ['named Parsing JSON', 'list reloaded']);
});
