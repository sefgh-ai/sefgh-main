// Characterization tests: the real Next handlers, with only GitHub replaced.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('./route-loader.mjs', import.meta.url);
const routes = {
  summary: '../../src/app/api/github/repo/route.js',
  detail: '../../src/app/api/github/repo/[owner]/[repo]/route.js',
  contents: '../../src/app/api/github/contents/[owner]/[repo]/route.js',
};
const handlers = Object.fromEntries(await Promise.all(Object.entries(routes).map(async ([key, path]) =>
  [key, (await import(new URL(path, import.meta.url).href)).GET])));
const contract = JSON.parse(await readFile(new URL('../../contracts/github-repositories/cases.json', import.meta.url), 'utf8'));

test('repository case ids are unique', () => {
  assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
});

for (const c of contract.cases) {
  test(`${c.id} [${c.disposition}]`, async () => {
    const originalFetch = globalThis.fetch;
    const originalError = console.error;
    const originalLog = console.log;
    const originalToken = process.env.GITHUB_TOKEN;
    const calls = [];
    if (c.github_token) process.env.GITHUB_TOKEN = c.github_token;
    else delete process.env.GITHUB_TOKEN;
    console.error = console.log = () => {};
    globalThis.fetch = async (url, init) => {
      const reply = c.calls[calls.length];
      calls.push({ url, headers: init?.headers, next: init?.next ?? null });
      if (!reply) throw new Error('unexpected upstream request');
      if (reply.network_error) throw new TypeError('fetch failed');
      return new Response(reply.raw_body ?? JSON.stringify(reply.body), {
        status: reply.status, headers: reply.response_headers,
      });
    };
    try {
      const request = new Request(`http://localhost${c.request}`);
      const segments = new URL(request.url).pathname.split('/');
      const response = await handlers[c.route](request, {
        params: Promise.resolve({owner: decodeURIComponent(segments[4] ?? ''), repo: decodeURIComponent(segments[5] ?? '')}),
      });
      assert.equal(response.status, c.expect.status);
      assert.deepEqual(await response.json(), c.expect.body);
      assert.equal(response.headers.get('content-type'), 'application/json');
      assert.equal(response.headers.get('cache-control'), null);
      assert.equal(response.headers.get('retry-after'), null);
      assert.deepEqual(calls, c.calls.map(({url, headers, next}) => ({url, headers, next})));
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalError;
      console.log = originalLog;
      if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = originalToken;
    }
  });
}
