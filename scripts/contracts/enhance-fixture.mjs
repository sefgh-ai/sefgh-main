// Runs the unchanged enhance-query handler with controlled provider keys and
// one stubbed provider reply. Only the environment, fetch and console.error
// are replaced, and all three are restored. No provider is contacted.
const KEY_NAMES = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

export async function runEnhanceFixture(POST, fixture) {
  const original = { fetch: globalThis.fetch, error: console.error };
  const savedKeys = Object.fromEntries(KEY_NAMES.map((name) => [name, process.env[name]]));
  const calls = [];
  try {
    for (const name of KEY_NAMES) delete process.env[name];
    for (const [name, value] of Object.entries(fixture.env ?? {})) process.env[name] = value;
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
      : new Request('https://app.test/api/ai/enhance-query', {
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
    for (const name of KEY_NAMES) {
      if (savedKeys[name] === undefined) delete process.env[name]; else process.env[name] = savedKeys[name];
    }
  }
}
