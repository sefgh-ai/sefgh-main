import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import config from '../../next.config.mjs';
const sharePaths = ['/api/share/:token', '/api/share/:token/fork', '/api/conversations/:id/share'];
function environment(t, origin, routes = '') {
  for (const [name, value] of Object.entries({ SEFGH_GO_API_URL: origin, SEFGH_GO_ROUTES: routes, NEXT_PUBLIC_SEFGH_GO_DATA: '' })) {
    const old = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
}
test('P7-03 share routes forward to Go without old switches', async t => {
  environment(t, 'https://go.example///');
  const expected = sharePaths.map(path => ({ source: path, destination: `https://go.example${path}` }));
  for (const routes of ['', 'unknown', 'share-token,share-fork,conversation-share']) {
    process.env.SEFGH_GO_ROUTES = routes;
    const actual = (await config.rewrites()).beforeFiles.filter(route => sharePaths.includes(route.source));
    assert.deepEqual(actual, expected);
  }
});
test('P7-03 has no Next share handlers or unused browser helper; missing origin has no rewrite', async t => {
  environment(t, undefined, 'share-token,share-fork,conversation-share');
  for (const path of sharePaths) {
    const source = path.replace(':token', '[token]').replace(':id', '[id]');
    assert.equal(existsSync(new URL(`../../src/app${source}/route.js`, import.meta.url)), false, source);
  }
  assert.equal(existsSync(new URL('../../src/lib/supabase/shares.js', import.meta.url)), false);
  assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
});
test('share contracts retain cases without Next-only expectations', () => {
  function check(value, location) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!key.startsWith('next_'), `${location}.${key}`);
      check(child, `${location}.${key}`);
    }
  }
  for (const name of ['share-token', 'share-fork', 'conversation-share']) {
    const contract = JSON.parse(readFileSync(new URL(`../../contracts/${name}/cases.json`, import.meta.url), 'utf8'));
    assert.ok(contract.cases.length > 0);
    assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
    check(contract, name);
  }
});
