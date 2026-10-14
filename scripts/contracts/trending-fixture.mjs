// Characterization helper: replace only time, randomness and the upstream.
// The real Next.js GET handler runs unchanged. Every global is restored.
export async function runTrendingFixture(GET, fixture) {
  const original = { fetch: globalThis.fetch, Date: globalThis.Date, random: Math.random, error: console.error, tz: process.env.TZ };
  const calls = [];
  let randomCalls = 0;
  try {
    process.env.TZ = fixture.timezone;
    globalThis.Date = class extends original.Date {
      constructor(...args) { super(...(args.length ? args : [fixture.now])); }
      static now() { return new original.Date(fixture.now).getTime(); }
    };
    // Version 2 has no randomness; any call is counted, and fixtures expect none.
    Math.random = () => { randomCalls++; return 0.5; };
    console.error = () => {};
    globalThis.fetch = async (url, init) => {
      calls.push({ url, headers: init.headers });
      if (fixture.upstream.network_error) throw new TypeError('fetch failed');
      return new Response(fixture.upstream.raw_body ?? JSON.stringify(fixture.upstream.body), {
        status: fixture.upstream.status, headers: {'content-type':'application/json'},
      });
    };
    const response = await GET(new Request(`https://app.test${fixture.request}`));
    return {
      status: response.status,
      body: await response.json(),
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      calls,
      random_calls: randomCalls,
    };
  } finally {
    globalThis.fetch = original.fetch;
    globalThis.Date = original.Date;
    Math.random = original.random;
    console.error = original.error;
    if (original.tz === undefined) delete process.env.TZ; else process.env.TZ = original.tz;
  }
}
