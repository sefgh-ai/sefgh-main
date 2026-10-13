import { fixtureRequest } from './access-fixture.mjs';
// Replays contracts/github-contributions/cases.json against the real Next.js
// handler. Each case fixes GitHub's reply, the clock and the server time zone,
// because the handler derives its date range from all three.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('./route-loader.mjs', import.meta.url);
const { GET } = await import(new URL('../../src/app/api/github/contributions/route.js', import.meta.url).href);
const contract = JSON.parse(await readFile(new URL('../../contracts/github-contributions/cases.json', import.meta.url), 'utf8'));
const RealDate = Date;

test('contribution cases are well formed', () => {
  assert.ok(contract.cases.length > 0);
  assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(!Number.isNaN(RealDate.parse(c.now)), `${c.id}: now`);
    for (const call of c.calls) assert.equal(call.url, contract.graphql_url, c.id);
  }
});

for (const c of contract.cases) {
  test(`contributions: ${c.id} [${c.disposition}]`, async () => {
    const saved = {
      fetch: globalThis.fetch, error: console.error, log: console.log,
      token: process.env.GITHUB_TOKEN, zone: process.env.TZ,
    };
    const fixedNow = RealDate.parse(c.now);
    // Only "now" is replaced. Dates built from a value behave normally.
    globalThis.Date = class extends RealDate {
      constructor(...args) { if (args.length === 0) super(fixedNow); else super(...args); }
      static now() { return fixedNow; }
    };
    process.env.TZ = c.time_zone;
    if (c.github_token) process.env.GITHUB_TOKEN = c.github_token;
    else delete process.env.GITHUB_TOKEN;
    console.error = console.log = () => {};
    const calls = [];
    globalThis.fetch = async (url, init) => {
      const reply = c.calls[calls.length];
      calls.push({ url, method: init?.method, headers: init?.headers, body: JSON.parse(init.body) });
      if (!reply) throw new Error('unexpected upstream request');
      if (reply.network_error) throw new TypeError('fetch failed');
      return new Response(reply.raw_body ?? JSON.stringify(reply.body), { status: reply.status });
    };
    try {
      const response = await GET(fixtureRequest(`http://localhost${c.request}`, c.github_token));
      assert.equal(response.status, c.expect.status);
      assert.deepEqual(await response.json(), c.expect.body);
      assert.equal(response.headers.get('content-type'), 'application/json');
      assert.equal(response.headers.get('cache-control'), c.github_token ? 'private, no-store' : null);
      assert.equal(response.headers.get('retry-after'), null);
      assert.deepEqual(calls, c.calls.map(call => ({
        url: call.url, method: call.method, headers: call.headers,
        body: { query: contract.query, variables: call.variables },
      })));
    } finally {
      globalThis.Date = RealDate;
      globalThis.fetch = saved.fetch;
      console.error = saved.error;
      console.log = saved.log;
      if (saved.token === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = saved.token;
      if (saved.zone === undefined) delete process.env.TZ;
      else process.env.TZ = saved.zone;
    }
  });
}
