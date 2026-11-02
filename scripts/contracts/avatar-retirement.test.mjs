// P7-06 guard: the avatar upload has no Next.js handler and always forwards
// to Go, whatever the old switch name says.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import config from '../../next.config.mjs';
const path = '/api/upload-avatar';
function environment(t, origin, routes = '') {
  for (const [name, value] of Object.entries({ SEFGH_GO_API_URL: origin, SEFGH_GO_ROUTES: routes, NEXT_PUBLIC_SEFGH_GO_DATA: '' })) {
    const old = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
}
test('P7-06 avatar upload forwards to Go without the old switch', async (t) => {
  environment(t, 'https://go.example///');
  for (const routes of ['', 'unknown', 'upload-avatar']) {
    process.env.SEFGH_GO_ROUTES = routes;
    const actual = (await config.rewrites()).beforeFiles.filter((route) => route.source === path);
    assert.deepEqual(actual, [{ source: path, destination: `https://go.example${path}` }]);
  }
});
test('P7-06 has no Next.js handler, recorder or fixture; a missing origin has no rewrite', async (t) => {
  environment(t, undefined, 'upload-avatar');
  assert.equal(existsSync(new URL(`../../src/app${path}/route.js`, import.meta.url)), false);
  for (const file of ['record-upload-avatar', 'avatar-fixture']) {
    assert.equal(existsSync(new URL(`./${file}.mjs`, import.meta.url)), false, file);
  }
  assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
});
