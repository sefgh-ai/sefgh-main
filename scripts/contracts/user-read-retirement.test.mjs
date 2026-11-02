// P7-04 guard: the caller's own reads (activity, starred) have no Next.js
// handler and always forward to Go, whatever the old switch names say.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import config from '../../next.config.mjs';
const paths = ['/api/activity', '/api/repo/starred'];
function environment(t, origin, routes = '') {
  for (const [name, value] of Object.entries({ SEFGH_GO_API_URL: origin, SEFGH_GO_ROUTES: routes, NEXT_PUBLIC_SEFGH_GO_DATA: '' })) {
    const old = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
}
test('P7-04 user reads forward to Go without the old switches', async (t) => {
  environment(t, 'https://go.example///');
  const expected = paths.map((path) => ({ source: path, destination: `https://go.example${path}` }));
  for (const routes of ['', 'unknown', 'activity,repo-starred']) {
    process.env.SEFGH_GO_ROUTES = routes;
    const actual = (await config.rewrites()).beforeFiles.filter((route) => paths.includes(route.source));
    assert.deepEqual(actual, expected);
  }
});
test('P7-04 has no Next.js handlers or Next-only test helpers; a missing origin has no rewrite', async (t) => {
  environment(t, undefined, 'activity,repo-starred');
  for (const path of paths) assert.equal(existsSync(new URL(`../../src/app${path}/route.js`, import.meta.url)), false, path);
  for (const helper of ['activity-fixture.mjs', 'activity-loader.mjs', 'starred-fixture.mjs', 'starred-loader.mjs', 'record-repo-starred.mjs']) {
    assert.equal(existsSync(new URL(`./${helper}`, import.meta.url)), false, helper);
  }
  assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
});
