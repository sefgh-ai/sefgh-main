// The browser side of chat: src/lib/ai/chat-request.js. The Go backend
// accepts a Supabase bearer only, so every chat request from the browser has
// to carry one. The browser Supabase client is replaced by ai-chat-loader.mjs.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
register('./ai-chat-loader.mjs', import.meta.url);
const { postChat } = await import('../../src/lib/ai/chat-request.js');
const { verifySessionBearer } = await import('../../src/lib/supabase/verify-bearer.js');

// A token shaped like a Supabase access token: three base64url parts.
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLWEifQ.c2lnbmF0dXJlLV8';

async function send(session, body, { fails = false } = {}) {
  const original = globalThis.fetch;
  const sent = [];
  try {
    globalThis.__chatBrowserSession = session;
    globalThis.__chatBrowserFails = fails;
    globalThis.fetch = async (url, init) => { sent.push({ url, ...init }); return Response.json({ response: 'Hello!' }); };
    const response = await postChat(body);
    assert.equal(response.status, 200);
    return sent;
  } finally {
    delete globalThis.__chatBrowserSession;
    delete globalThis.__chatBrowserFails;
    globalThis.fetch = original;
  }
}

const signedIn = { data: { session: { access_token: ACCESS_TOKEN } }, error: null };
const body = { messages: [{ role: 'user', content: 'hi' }], action: 'generate_title' };

test('a signed-in browser sends its access token as a bearer, to chat only', async () => {
  const sent = await send(signedIn, body);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, '/api/ai/chat');
  assert.equal(sent[0].method, 'POST');
  assert.deepEqual(sent[0].headers, { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` });
  assert.deepEqual(JSON.parse(sent[0].body), body);
});

test('without a session, or when it cannot be read, no Authorization header is sent', async () => {
  for (const [name, session, fails] of [
    ['no session', undefined, false],
    ['a session without a token', { data: { session: {} }, error: null }, false],
    ['no data', { error: { message: 'expired' } }, false],
    ['reading the session fails', signedIn, true],
  ]) {
    const sent = await send(session, body, { fails });
    assert.deepEqual(sent[0].headers, { 'Content-Type': 'application/json' }, name);
  }
});

// What the browser sends is what the sign-in check reads. The same pattern
// is used by the Go check, githubaccess.SignedInUser.
test('the header the browser sends is one the sign-in check accepts', async () => {
  const [sent] = await send(signedIn, body);
  let asked;
  const fetch = async (url, init) => { asked = new Headers(init.headers).get('authorization'); return Response.json({ id: 'user-a' }); };
  const request = new Request('https://app.test/api/ai/chat', { method: 'POST', headers: sent.headers, body: sent.body });
  assert.deepEqual(await verifySessionBearer(request, { fetch, supabaseURL: 'https://auth.test', supabaseKey: 'k' }), { status: 200, userId: 'user-a' });
  assert.equal(asked, `Bearer ${ACCESS_TOKEN}`);
});
