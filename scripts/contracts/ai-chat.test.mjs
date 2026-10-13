import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { expand } from './ai-fixture-common.mjs';
import { FIXTURE_TOKEN, runChatFixture } from './chat-fixture.mjs';
register('./ai-chat-loader.mjs', import.meta.url);
// src/lib/ai/github.js copies GITHUB_TOKEN when it is imported, so the fake
// has to be in place first. Each test file runs in its own process.
process.env.GITHUB_TOKEN = FIXTURE_TOKEN;
const { POST } = await import('../../src/app/api/ai/chat/route.js');
const { chatLimiter } = await import('../../src/lib/ai/guard.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/ai-chat/cases.json', import.meta.url)));

test('chat fixture integrity and provider boundary', () => {
  assert.equal(contract.contract_version, 2);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(c.reason, c.id);
    assert.ok(c.expect.calls.length <= 1, c.id);
    assert.ok(c.expect.identity_calls <= 1, c.id);
    // Nothing reaches the provider unless the caller was let in.
    if (c.expect.status === 400 || c.expect.status === 401 || c.expect.status === 429 || c.expect.status === 503) {
      assert.equal(c.expect.calls.length, 0, c.id);
    }
    if (c.expect.status === 429) assert.match(c.expect.retry_after, /^[1-9][0-9]*$/, c.id);
    // No reply repeats an internal or provider error.
    if (c.expect.status === 500) assert.deepEqual(c.expect.body, { error: 'Failed to generate AI response' }, c.id);
    for (const call of c.expect.calls) {
      assert.equal(call.url, 'https://models.inference.ai.azure.com/chat/completions', c.id);
      assert.equal(call.method, 'POST', c.id);
      assert.equal(call.headers.authorization, `Bearer ${FIXTURE_TOKEN}`, c.id);
      // The application's instructions always come first, and a caller's
      // message never carries a role other than user or assistant.
      const [first, ...rest] = expand(call.body.messages);
      assert.equal(first.role, 'system', c.id);
      for (const message of rest) {
        assert.ok(['user', 'assistant'].includes(message.role), c.id);
        assert.deepEqual(Object.keys(message).sort(), ['content', 'role'], c.id);
      }
    }
  }
});

for (const c of contract.cases) {
  test(`chat: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runChatFixture(POST, c), expand(c.expect));
  });
}

// The shared cases sign in with a bearer token, which is what the Go backend
// accepts. The browser sends none: Next.js then reads its own session cookie.
// That path exists only here, so it is tested only here.
const chatRequest = () => new Request('https://app.test/api/ai/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
});
async function withCookieSession(session, run) {
  const original = { fetch: globalThis.fetch, error: console.error };
  const provider = [];
  try {
    globalThis.__chatCookieSession = session;
    console.error = () => {};
    chatLimiter.reset();
    globalThis.fetch = async (url) => { provider.push(url); return Response.json({ choices: [{ message: { content: 'Hello!' } }] }); };
    return await run(provider);
  } finally {
    delete globalThis.__chatCookieSession;
    delete globalThis.__chatSupabaseFails;
    chatLimiter.reset();
    globalThis.fetch = original.fetch;
    console.error = original.error;
  }
}

test('Next.js only: a session cookie signs the caller in', async () => {
  await withCookieSession({ data: { user: { id: 'user-cookie' } }, error: null }, async (provider) => {
    const response = await POST(chatRequest());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { response: 'Hello!' });
    assert.equal(provider.length, 1);
  });
});

test('Next.js only: no cookie session, an anonymous one, or one with no id is refused', async () => {
  const refused = {
    'no session': undefined,
    'session error': { data: { user: { id: 'user-cookie' } }, error: { message: 'expired' } },
    'anonymous account': { data: { user: { id: 'user-x', is_anonymous: true } }, error: null },
    'user without id': { data: { user: {} }, error: null },
    'no data': { error: null },
  };
  for (const [name, session] of Object.entries(refused)) {
    await withCookieSession(session, async (provider) => {
      const response = await POST(chatRequest());
      assert.equal(response.status, 401, name);
      assert.deepEqual(await response.json(), { error: 'Sign in to use chat' }, name);
      assert.equal(provider.length, 0, name);
    });
  }
});

test('Next.js only: a cookie user has the same allowance as a bearer user', async () => {
  await withCookieSession({ data: { user: { id: 'user-cookie' } }, error: null }, async (provider) => {
    for (let i = 0; i < 30; i++) assert.equal((await POST(chatRequest())).status, 200, `request ${i + 1}`);
    const response = await POST(chatRequest());
    assert.equal(response.status, 429);
    assert.match(response.headers.get('retry-after'), /^[1-9][0-9]*$/);
    assert.equal(provider.length, 30);
  });
});

test('Next.js only: a session client that cannot be built is an outage', async () => {
  await withCookieSession(undefined, async (provider) => {
    globalThis.__chatSupabaseFails = true;
    const response = await POST(chatRequest());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Sign-in could not be verified' });
    assert.equal(provider.length, 0);
  });
});
