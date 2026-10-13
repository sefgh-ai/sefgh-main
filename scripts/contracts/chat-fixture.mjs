// Runs the unchanged chat handler and the unchanged src/lib/ai/github.js
// helper with a stubbed sign-in check and one stubbed provider reply. Only
// fetch, console.error, the clock and two public settings are replaced, and
// all are restored. No provider and no Supabase project is contacted.
//
// The helper reads GITHUB_TOKEN once, when it is first imported. The runner
// sets a fake value before importing the route; see ai-chat.test.mjs.
import { FIXTURE_NOW, FIXTURE_SUPABASE_KEY, FIXTURE_SUPABASE_URL, arrangeLimiter, fixtureRequest, freezeClock } from './ai-fixture-common.mjs';

export const FIXTURE_TOKEN = 'fixture-models-token';

// What the stand-in Supabase answers for each `session` a fixture can name.
// A session not listed here is unknown to Supabase and is refused.
const SESSIONS = {
  a: { status: 200, body: { id: 'user-a' } },
  b: { status: 200, body: { id: 'user-b' } },
  'anonymous-account': { status: 200, body: { id: 'user-x', is_anonymous: true } },
  'no-id': { status: 200, body: {} },
  outage: { status: 503, body: {} },
};

export async function runChatFixture(POST, fixture) {
  const { chatLimiter } = await import('../../src/lib/ai/guard.js');
  const original = { fetch: globalThis.fetch, error: console.error, url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
  const unfreeze = freezeClock();
  const calls = [];
  let identityCalls = 0;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = FIXTURE_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = FIXTURE_SUPABASE_KEY;
    arrangeLimiter(chatLimiter, SESSIONS[fixture.session]?.body?.id, fixture);
    console.error = () => {};
    globalThis.fetch = async (url, init = {}) => {
      if (url === `${FIXTURE_SUPABASE_URL}/auth/v1/user`) {
        identityCalls++;
        const headers = new Headers(init.headers);
        const session = /^Bearer session-(.+)$/.exec(headers.get('authorization') || '')?.[1];
        if (headers.get('apikey') !== FIXTURE_SUPABASE_KEY) return new Response('{}', { status: 401 });
        const answer = SESSIONS[session] ?? { status: 401, body: {} };
        return Response.json(answer.body, { status: answer.status });
      }
      calls.push({
        url, method: init.method,
        headers: Object.fromEntries(new Headers(init.headers)),
        body: JSON.parse(init.body),
      });
      const reply = fixture.upstream;
      if (!reply) throw new Error('Unexpected provider request');
      if (reply.network_error) throw new TypeError('fetch failed');
      return new Response(reply.raw_body ?? JSON.stringify(reply.body), {
        status: reply.status, headers: { 'content-type': 'application/json' },
      });
    };
    // `authorization` gives the header as written; `session` is shorthand
    // for a well-formed bearer.
    const headers = fixture.authorization !== undefined ? { authorization: fixture.authorization }
      : fixture.session ? { authorization: `Bearer session-${fixture.session}` } : {};
    const response = await POST(fixtureRequest('https://app.test/api/ai/chat', fixture, headers));
    return {
      status: response.status,
      body: await response.json(),
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      retry_after: response.headers.get('retry-after'),
      identity_calls: identityCalls,
      calls,
    };
  } finally {
    unfreeze();
    chatLimiter.reset();
    globalThis.fetch = original.fetch;
    console.error = original.error;
    if (original.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = original.url;
    if (original.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = original.key;
  }
}

export { FIXTURE_NOW };
