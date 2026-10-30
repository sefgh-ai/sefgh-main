import { fixtureRequest } from './access-fixture.mjs';

// Run the unchanged Next.js handler with fixture-only credentials and clock.
export async function runContributionsFixture(GET, c) {
  const saved = {fetch:globalThis.fetch, Date:globalThis.Date, error:console.error,
    log:console.log, token:process.env.GITHUB_TOKEN, zone:process.env.TZ};
  const RealDate = saved.Date;
  const calls = [];
  try {
    const fixedNow = RealDate.parse(c.now);
    globalThis.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [fixedNow])); }
      static now() { return fixedNow; }
    };
    process.env.TZ = c.time_zone;
    if (c.github_token) process.env.GITHUB_TOKEN = c.github_token;
    else delete process.env.GITHUB_TOKEN;
    console.error = console.log = () => {};
    globalThis.fetch = async (url, init) => {
      const reply = (c.next_calls ?? c.calls)[calls.length];
      calls.push({url,method:init?.method,headers:init?.headers,body:JSON.parse(init.body)});
      if (!reply) throw new Error('unexpected upstream request');
      if (reply.network_error) throw new TypeError('fetch failed');
      return new Response(reply.raw_body ?? JSON.stringify(reply.body),{status:reply.status});
    };
    const response = await GET(fixtureRequest(`http://localhost${c.request}`,c.github_token));
    return {status:response.status,body:await response.json(),calls,
      content_type:response.headers.get('content-type'),cache_control:response.headers.get('cache-control'),
      retry_after:response.headers.get('retry-after')};
  } finally {
    globalThis.Date=saved.Date; globalThis.fetch=saved.fetch;
    console.error=saved.error; console.log=saved.log;
    if(saved.token===undefined)delete process.env.GITHUB_TOKEN;else process.env.GITHUB_TOKEN=saved.token;
    if(saved.zone===undefined)delete process.env.TZ;else process.env.TZ=saved.zone;
  }
}
