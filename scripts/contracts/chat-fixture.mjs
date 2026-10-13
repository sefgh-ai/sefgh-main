// Runs the unchanged chat handler and the unchanged src/lib/ai/github.js
// helper with one stubbed provider reply. Only fetch and console.error are
// replaced, and both are restored. No provider is contacted.
//
// The helper reads GITHUB_TOKEN once, when it is first imported. The runner
// sets a fake value before importing the route; see ai-chat.test.mjs.
export const FIXTURE_TOKEN = 'fixture-models-token';

export async function runChatFixture(POST, fixture) {
  const original = { fetch: globalThis.fetch, error: console.error };
  const calls = [];
  try {
    console.error = () => {};
    globalThis.fetch = async (url, init = {}) => {
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
    // A controlled reader failure avoids pinning one JavaScript engine's
    // wording for a JSON syntax error.
    const request = fixture.json_error
      ? { json: async () => { throw new Error(fixture.json_error); } }
      : new Request('https://app.test/api/ai/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fixture.body),
      });
    const response = await POST(request);
    return {
      status: response.status,
      body: await response.json(),
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      calls,
    };
  } finally {
    globalThis.fetch = original.fetch;
    console.error = original.error;
  }
}
