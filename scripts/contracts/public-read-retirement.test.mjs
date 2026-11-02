import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { register } from 'node:module';
import { test } from 'node:test';
import config from '../../next.config.mjs';
register('./route-loader.mjs', import.meta.url);
const { fetchRepoForPage } = await import('../../src/lib/repo/repoData.js');
const publicPaths = ['/api/github/search', '/api/github/languages', '/api/github/trending', '/api/github/trending-developers', '/api/github/repo', '/api/github/repo/:owner/:repo', '/api/github/contents/:owner/:repo'];
function environment(t, origin, routes = '') {
  for (const [name, value] of Object.entries({ SEFGH_GO_API_URL: origin, SEFGH_GO_ROUTES: routes, NEXT_PUBLIC_SEFGH_GO_DATA: '' })) {
    const old = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
}
test('P7-02 public reads are forwarded without route switches', async t => {
  environment(t, 'https://go.example///');
  const expected = publicPaths.map(path => ({ source: path, destination: `https://go.example${path}` }));
  for (const routes of ['', 'unknown', 'github-search,github-search']) {
    process.env.SEFGH_GO_ROUTES = routes;
    assert.deepEqual(await config.rewrites(), { beforeFiles: expected });
  }
});
test('P7-02 has no local handlers and no rewrites without the Go origin', async t => {
  environment(t, undefined);
  for (const path of publicPaths) {
    const handler = path.replace(':owner', '[owner]').replace(':repo', '[repo]');
    assert.equal(existsSync(new URL(`../../src/app${handler}/route.js`, import.meta.url)), false, handler);
  }
  assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
});
test('repository page uses Go without the old public-repo switch', async t => {
  environment(t, 'https://go.example///');
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    sent.push({ url, init });
    return Response.json({ id: 1, private: false });
  });
  assert.deepEqual(await fetchRepoForPage('octo', 'demo'), { id: 1, private: false });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://go.example/api/github/public-repo/octo/demo');
  assert.equal(new Headers(sent[0].init.headers).has('authorization'), false);
  assert.equal(sent[0].init.cache, 'no-store');
  assert.equal(sent[0].init.redirect, 'error');
});
test('repository page has no GitHub fallback when the Go origin is absent', async t => {
  environment(t, undefined);
  let sent = 0;
  t.mock.method(globalThis, 'fetch', async () => { sent++; return Response.json({ private: false }); });
  assert.equal(await fetchRepoForPage('octo', 'demo'), null);
  assert.equal(sent, 0);
});
test('retained Go contracts have no Next-only expectations', () => {
  function check(value, location) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!key.startsWith('next_'), `${location}.${key}`);
      check(child, `${location}.${key}`);
    }
  }
  for (const name of ['github-search', 'github-languages', 'github-trending', 'github-trending-developers', 'github-repositories', 'public-repository-reads']) {
    const contract = JSON.parse(readFileSync(new URL(`../../contracts/${name}/cases.json`, import.meta.url), 'utf8'));
    check(contract, name);
  }
});
