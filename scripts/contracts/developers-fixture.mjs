// Runs the unchanged handler with controlled time and keyed upstream replies.
// Network replies may finish in a different order from their invocation.
export async function runDevelopersFixture(GET, fixture) {
  const originals = {
    fetch: globalThis.fetch, Date: globalThis.Date, error: console.error,
    timezone: process.env.TZ, token: process.env.GITHUB_TOKEN,
  };
  const calls = [];
  const pending = [];
  try {
    process.env.TZ = fixture.timezone;
    process.env.GITHUB_TOKEN = 'fixture-server-token-must-not-be-sent';
    globalThis.Date = class extends originals.Date {
      constructor(...args) { super(...(args.length ? args : [fixture.now])); }
      static now() { return new originals.Date(fixture.now).getTime(); }
    };
    console.error = () => {};
    globalThis.fetch = (url, init = {}) => {
      const step = fixture.upstream[calls.length];
      calls.push({
        url, wire_url: new URL(url).href,
        headers: Object.fromEntries(new Headers(init.headers)),
      });
      const response = (async () => {
        if (!step) throw new Error('Unexpected upstream request');
        if (step.delay_ms) await new Promise(resolve => setTimeout(resolve, step.delay_ms));
        if (step.network_error) throw new TypeError('fetch failed');
        return new Response(step.raw_body ?? JSON.stringify(step.body), {
          status: step.status, headers: step.headers,
        });
      })();
      pending.push(response);
      return response;
    };
    const response = await GET(new Request(`https://app.test${fixture.request}`, { headers: fixture.request_headers }));
    const body = await response.json();
    // Promise.all can reject early while sibling upstream requests still run.
    await Promise.allSettled(pending);
    return {
      status: response.status, body,
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      retry_after: response.headers.get('retry-after'),
      calls,
    };
  } finally {
    await Promise.allSettled(pending);
    globalThis.fetch = originals.fetch;
    globalThis.Date = originals.Date;
    console.error = originals.error;
    if (originals.timezone === undefined) delete process.env.TZ; else process.env.TZ = originals.timezone;
    if (originals.token === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = originals.token;
  }
}
