// P7-08a guard: search history and onboarding have no direct database path
// in the browser, and their routes always forward to Go, whatever
// NEXT_PUBLIC_SEFGH_GO_DATA says.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import config from '../../next.config.mjs';
const paths = ['/api/search-history', '/api/search-history/:path*', '/api/onboarding'];
function environment(t, origin, areas = '') {
  for (const [name, value] of Object.entries({ SEFGH_GO_API_URL: origin, SEFGH_GO_ROUTES: '', NEXT_PUBLIC_SEFGH_GO_DATA: areas })) {
    const old = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
}
test('P7-08a routes forward to Go without the old area names', async (t) => {
  environment(t, 'https://go.example///');
  const expected = paths.map((path) => ({ source: path, destination: `https://go.example${path}` }));
  for (const areas of ['', 'unknown', 'search-history,onboarding']) {
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = areas;
    const actual = (await config.rewrites()).beforeFiles.filter((route) => paths.includes(route.source));
    assert.deepEqual(actual, expected);
  }
});
test('P7-08a modules have no direct path or recorder; a missing origin has no rewrite', async (t) => {
  environment(t, undefined, 'search-history,onboarding');
  for (const name of ['search-history', 'onboarding']) {
    const source = readFileSync(new URL(`../../src/lib/supabase/${name}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /createClient|\.from\(|\.rpc\(|usesGo|NOT_SERVED/, name);
    assert.equal(existsSync(new URL(`./record-${name}.mjs`, import.meta.url)), false, name);
  }
  assert.doesNotMatch(readFileSync(new URL('../../src/lib/go-data.js', import.meta.url), 'utf8'), /usesGo|NOT_SERVED|resultFrom/);
  assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
});
