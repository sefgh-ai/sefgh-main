// QUOTA-001: the server's public read token. The shared cases in
// contracts/public-read-token run against createPublicReader; the Go
// backend runs the same file against publictoken.Transport. The tests after
// them check that each signed-out GitHub read in Next.js goes through it.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { createPublicReader, publicGitHubFetch, resetPublicGitHubFetch, PUBLIC_TOKEN_TRUST_MS, PUBLIC_TOKEN_RETRY_MS } = await import('../../src/lib/github/public-token.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/public-read-token/cases.json', import.meta.url), 'utf8'));

const START = Date.parse('2026-10-14T12:00:00Z');

function reply(status, scopes, body) {
  const headers = { 'content-type': 'text/plain' };
  if (scopes !== undefined) headers['x-oauth-scopes'] = scopes;
  return new Response(status === 204 ? null : body, { status, headers });
}

// The stand-in GitHub a case describes. It records every request.
function standIn(c, token, calls, current) {
  return async (url, init = {}) => {
    const authorization = new Headers(init.headers).get('authorization');
    calls.push([(init.method ?? 'GET').toUpperCase(), url, authorization]);
    if (url === `${contract.origin}/user`) {
      if (c.user.network_error) throw new TypeError('fetch failed');
      return reply(c.user.status, c.user.scopes, '{}');
    }
    if (token && authorization === `Bearer ${token}`) {
      const r = current().reply_with_token ?? { status: 200, scopes: '' };
      return reply(r.status, r.scopes, 'public');
    }
    return reply(200, undefined, 'plain');
  };
}

test('public read token fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  assert.equal(PUBLIC_TOKEN_TRUST_MS, 600_000);
  assert.equal(PUBLIC_TOKEN_RETRY_MS, 60_000);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(c.reason, c.id);
    for (const r of c.requests) {
      // The public token never goes anywhere but the GitHub API origin.
      for (const [, url, authorization] of r.expect.calls) {
        if (authorization === `Bearer ${contract.token}`) assert.ok(url.startsWith(`${contract.origin}/`), c.id);
      }
    }
  }
});

for (const c of contract.cases) {
  test(`public read token: ${c.id}`, async () => {
    const token = c.token === undefined ? contract.token : c.token;
    let clock = START;
    let request = null;
    const calls = [];
    const read = createPublicReader({ token, origin: contract.origin, send: standIn(c, token, calls, () => request), now: () => clock });
    for (const [index, r] of c.requests.entries()) {
      clock = START + r.at_seconds * 1000;
      request = r;
      calls.length = 0;
      const headers = r.authorization ? { Authorization: r.authorization } : {};
      const response = await read(r.url, { method: r.method, headers });
      assert.deepEqual({ status: response.status, body: await response.text(), calls }, r.expect, `request ${index + 1}`);
    }
  });
}

// Callers wait for one check, not one each.
test('requests that arrive during a check share it', async () => {
  const calls = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const read = createPublicReader({
    token: 'p', origin: 'https://api.github.test', now: () => START,
    send: async (url, init) => {
      calls.push(url);
      if (url.endsWith('/user')) { await gate; return reply(200, '', '{}'); }
      return reply(200, '', new Headers(init.headers).get('authorization'));
    },
  });
  const answers = Promise.all([1, 2, 3].map((n) => read(`https://api.github.test/r/${n}`).then((r) => r.text())));
  release();
  assert.deepEqual(await answers, ['Bearer p', 'Bearer p', 'Bearer p']);
  assert.equal(calls.filter((url) => url.endsWith('/user')).length, 1);
});

test('the token is never written to the log', async () => {
  const logged = [];
  const read = createPublicReader({
    token: 'secret-public-token', origin: 'https://api.github.test', now: () => START, log: (m) => logged.push(m),
    send: async (url) => (url.endsWith('/user') ? reply(200, 'repo', '{}') : reply(200, undefined, 'plain')),
  });
  await read('https://api.github.test/r');
  assert.equal(logged.length, 1);
  assert.match(logged[0], /scopes "repo"/);
  assert.doesNotMatch(logged.join('\n'), /secret-public-token/);
});

// Every signed-out GitHub read in Next.js uses the shared reader. Global
// fetch is replaced and the variable set; both are restored.
async function withPublicToken(run) {
  const original = { fetch: globalThis.fetch, token: process.env.GITHUB_PUBLIC_READ_TOKEN, error: console.error };
  const seen = [];
  try {
    process.env.GITHUB_PUBLIC_READ_TOKEN = 'public-read';
    resetPublicGitHubFetch();
    console.error = () => {};
    globalThis.fetch = async (url, init = {}) => {
      seen.push(`${url}|${new Headers(init.headers).get('authorization') ?? ''}`);
      if (url === 'https://api.github.com/user') return reply(200, '', '{}');
      if (String(url).includes('/search/users')) return Response.json({ items: [{ login: 'octo', avatar_url: '', html_url: '' }] }, { headers: { 'x-oauth-scopes': '' } });
      if (String(url).includes('/users/octo/repos')) return Response.json([], { headers: { 'x-oauth-scopes': '' } });
      if (String(url).includes('/search/repositories')) return Response.json({ total_count: 0, items: [] }, { headers: { 'x-oauth-scopes': '' } });
      return Response.json({ id: 1, name: 'demo', full_name: 'octo/demo', private: false }, { headers: { 'x-oauth-scopes': '' } });
    };
    await run(seen);
  } finally {
    globalThis.fetch = original.fetch;
    console.error = original.error;
    if (original.token === undefined) delete process.env.GITHUB_PUBLIC_READ_TOKEN; else process.env.GITHUB_PUBLIC_READ_TOKEN = original.token;
    resetPublicGitHubFetch();
  }
}

test('without the variable, the shared reader is plain fetch', async () => {
  const original = globalThis.fetch;
  const token = process.env.GITHUB_PUBLIC_READ_TOKEN;
  try {
    delete process.env.GITHUB_PUBLIC_READ_TOKEN;
    resetPublicGitHubFetch();
    const seen = [];
    globalThis.fetch = async (url, init) => { seen.push([url, init]); return reply(200, undefined, 'plain'); };
    const init = { headers: { Accept: 'x' }, next: { revalidate: 3600 } };
    await publicGitHubFetch('https://api.github.com/repos/octo/demo', init);
    assert.equal(seen.length, 1);
    assert.equal(seen[0][1], init, 'the same init object, untouched');
  } finally {
    globalThis.fetch = original;
    if (token !== undefined) process.env.GITHUB_PUBLIC_READ_TOKEN = token;
    resetPublicGitHubFetch();
  }
});

// Its refusal of private repositories is pinned in public-repository-reads.
test('the retained starred enrichment helper reads with the public token', async () => {
  const { fetchRepoFromGitHub } = await import('../../src/lib/repo/repoData.js');
  await withPublicToken(async (seen) => {
    assert.equal((await fetchRepoFromGitHub('octo', 'demo'))?.full_name, 'octo/demo');
    assert.deepEqual(seen, ['https://api.github.com/user|Bearer public-read', 'https://api.github.com/repos/octo/demo|Bearer public-read']);
  });
});
