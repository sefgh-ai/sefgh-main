// P7-08b guard: the Go data proxy's areas always forward to Go, whatever
// NEXT_PUBLIC_SEFGH_GO_DATA says, and nothing in the code reads that
// setting any more.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import config from '../../next.config.mjs';
import { PROXY_AREAS } from '../../src/lib/go-areas.mjs';
const paths = Object.keys(PROXY_AREAS).map((area) => `/api/data/${area}/:path*`);
function environment(t, origin, areas = '') {
  for (const [name, value] of Object.entries({ SEFGH_GO_API_URL: origin, SEFGH_GO_ROUTES: '', NEXT_PUBLIC_SEFGH_GO_DATA: areas })) {
    const old = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
}
test('P7-08b proxy areas forward to Go without the old setting', async (t) => {
  environment(t, 'https://go.example///');
  const expected = paths.map((path) => ({ source: path, destination: `https://go.example${path}` }));
  for (const areas of ['', 'unknown', Object.keys(PROXY_AREAS).join(',')]) {
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = areas;
    const actual = (await config.rewrites()).beforeFiles.filter((route) => paths.includes(route.source));
    assert.deepEqual(actual, expected);
  }
});
test('P7-08b: no code reads the setting; a missing origin has no rewrite', async (t) => {
  environment(t, undefined, Object.keys(PROXY_AREAS).join(','));
  const walk = (dir) => readdirSync(new URL(dir, import.meta.url), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(`${dir}${entry.name}/`) : /\.(js|jsx|mjs)$/.test(entry.name) ? [`${dir}${entry.name}`] : []);
  for (const file of [...walk('../../src/'), '../../next.config.mjs']) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /NEXT_PUBLIC_SEFGH_GO_DATA|usesGo/, file);
  }
  assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
});
