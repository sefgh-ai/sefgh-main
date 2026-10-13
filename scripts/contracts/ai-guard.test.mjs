import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { AI_LIMITS, clientAddress, createRateLimiter, prepareChatMessages } = await import('../../src/lib/ai/guard.js');
const { verifySessionBearer } = await import('../../src/lib/supabase/verify-bearer.js');

// The route fixtures cover the limits as a caller sees them. These tests
// cover what a caller cannot see from one request.

test('the limits are the ones the owner approved on 2026-10-13', () => {
  assert.deepEqual(AI_LIMITS, { requests: 30, windowMs: 300000, chatMessages: 20, chatCharacters: 8000, queryCharacters: 500 });
});

test('limiter: counts per key and reports the wait in whole seconds', () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 10_000 });
  assert.equal(limiter.take('a', 1000), 0);
  assert.equal(limiter.take('a', 4000), 0);
  assert.equal(limiter.take('b', 4000), 0, 'another key has its own count');
  assert.equal(limiter.take('a', 4500), 7, 'the oldest request leaves at 11000: 6.5 s, rounded up');
  assert.equal(limiter.take('a', 10_999), 1, 'never less than one second');
  assert.equal(limiter.take('a', 11_000), 0, 'allowed once the oldest is exactly one window old');
  assert.equal(limiter.take('a', 11_001), 3, 'the request at 4000 is the oldest now');
});

test('limiter: a refused request is not counted', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 10_000 });
  assert.equal(limiter.take('a', 0), 0);
  for (let t = 1; t < 10_000; t += 1000) assert.notEqual(limiter.take('a', t), 0);
  assert.equal(limiter.take('a', 10_000), 0, 'only the first request was holding the allowance');
});

test('limiter: remembers a bounded number of callers and forgets the one unused for longest', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, maxKeys: 3 });
  for (const key of ['a', 'b', 'c']) assert.equal(limiter.take(key, 0), 0);
  assert.notEqual(limiter.take('a', 1), 0, 'a is refused, and is now the most recently seen');
  assert.equal(limiter.take('d', 2), 0, 'a fourth caller pushes out b');
  assert.equal(limiter.take('b', 3), 0, 'b was forgotten, so it starts again');
  assert.notEqual(limiter.take('a', 4), 0, 'a was kept');
  assert.notEqual(limiter.take('d', 5), 0, 'd was kept');
});

test('limiter: reset forgets everything', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 10_000 });
  limiter.take('a', 0);
  limiter.reset();
  assert.equal(limiter.take('a', 1), 0);
});

test('clientAddress: the first forwarded address, trimmed, or "unknown"', () => {
  const from = (value) => clientAddress(new Request('https://app.test/', value === undefined ? {} : { headers: { 'x-forwarded-for': value } }));
  assert.equal(from(undefined), 'unknown');
  assert.equal(from(''), 'unknown');
  assert.equal(from('203.0.113.9'), '203.0.113.9');
  assert.equal(from(' 203.0.113.9 , 10.0.0.1'), '203.0.113.9');
  assert.equal(from(', 10.0.0.1'), 'unknown');
});

test('prepareChatMessages: returns copies holding only role and content', () => {
  const original = [{ role: 'user', content: 'hi', name: 'x' }];
  const { messages } = prepareChatMessages(original);
  assert.deepEqual(messages, [{ role: 'user', content: 'hi' }]);
  assert.deepEqual(original, [{ role: 'user', content: 'hi', name: 'x' }], 'the caller\'s list is not changed');
});

test('prepareChatMessages: the newest message is never the one dropped', () => {
  const long = 'x'.repeat(AI_LIMITS.chatCharacters);
  assert.deepEqual(prepareChatMessages([{ role: 'user', content: 'old' }, { role: 'user', content: long }]).messages, [{ role: 'user', content: long }]);
  assert.deepEqual(prepareChatMessages([{ role: 'user', content: long + 'x' }]), { error: 'Message is too long' });
});

// verifySessionBearer is the sign-in check the Go backend will share. The chat
// fixtures cover its answers; these cover what it sends and when it gives up.
const bearerRequest = (authorization) => new Request('https://app.test/api/ai/chat', { headers: authorization === undefined ? {} : { authorization } });
const settings = (fetch) => ({ supabaseURL: 'https://auth.test/', supabaseKey: 'public-key', fetch });

test('verifySessionBearer: asks the project with the bearer and the public key, once', async () => {
  const seen = [];
  const result = await verifySessionBearer(bearerRequest('Bearer session-a'), settings(async (url, init) => {
    seen.push({ url, authorization: init.headers.Authorization, apikey: init.headers.apikey, cache: init.cache, redirect: init.redirect });
    return Response.json({ id: 'user-a' });
  }));
  assert.deepEqual(result, { status: 200, userId: 'user-a' });
  assert.deepEqual(seen, [{ url: 'https://auth.test/auth/v1/user', authorization: 'Bearer session-a', apikey: 'public-key', cache: 'no-store', redirect: 'error' }]);
});

test('verifySessionBearer: refuses on sight without asking', async () => {
  const refused = [undefined, '', 'Bearer', 'Bearer ', 'Basic abc', 'Bearer two words', `Bearer ${'a'.repeat(8193)}`];
  for (const authorization of refused) {
    let asked = 0;
    const result = await verifySessionBearer(bearerRequest(authorization), settings(async () => { asked++; return Response.json({ id: 'user-a' }); }));
    assert.deepEqual(result, { status: 401 }, String(authorization).slice(0, 20));
    assert.equal(asked, 0, String(authorization).slice(0, 20));
  }
});

test('verifySessionBearer: answers by what Supabase says', async () => {
  const cases = [
    [Response.json({ id: 'user-a' }), { status: 200, userId: 'user-a' }],
    [Response.json({ id: 'user-a', is_anonymous: true }), { status: 401 }],
    [Response.json({}), { status: 401 }],
    [Response.json({ id: 42 }), { status: 401 }],
    [Response.json(null), { status: 401 }],
    [Response.json({}, { status: 401 }), { status: 401 }],
    [Response.json({}, { status: 403 }), { status: 401 }],
    [Response.json({ id: 'user-a' }, { status: 201 }), { status: 503 }],
    [Response.json({}, { status: 500 }), { status: 503 }],
    [new Response('{broken'), { status: 503 }],
  ];
  for (const [reply, want] of cases) {
    assert.deepEqual(await verifySessionBearer(bearerRequest('Bearer session-a'), settings(async () => reply)), want);
  }
  const offline = await verifySessionBearer(bearerRequest('Bearer session-a'), settings(async () => { throw new TypeError('fetch failed'); }));
  assert.deepEqual(offline, { status: 503 });
});

test('verifySessionBearer: missing configuration is an outage and asks nobody', async () => {
  for (const options of [{ supabaseURL: '', supabaseKey: 'public-key' }, { supabaseURL: 'https://auth.test', supabaseKey: '' }]) {
    let asked = 0;
    const result = await verifySessionBearer(bearerRequest('Bearer session-a'), { ...options, fetch: async () => { asked++; return Response.json({ id: 'user-a' }); } });
    assert.deepEqual(result, { status: 503 });
    assert.equal(asked, 0);
  }
});

test('verifySessionBearer: gives up at the deadline', async () => {
  const keepRunning = setInterval(() => {}, 10);
  try {
    const started = Date.now();
    const result = await verifySessionBearer(bearerRequest('Bearer session-a'), {
      ...settings((url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)))),
      deadlineMs: 30,
    });
    assert.deepEqual(result, { status: 503 });
    assert.ok(Date.now() - started < 2000);
  } finally {
    clearInterval(keepRunning);
  }
});
