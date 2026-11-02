// P7-05 guard: the repository interactions (save, vote, rate, comment, vote on
// a comment, videos) have no Next.js handler and always forward to Go,
// whatever the old switch names say.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import config from '../../next.config.mjs';
const paths = ['/api/repo/collect', '/api/repo/vote', '/api/repo/rating', '/api/repo/comments/vote', '/api/repo/comments', '/api/repo/videos'];
const oldNames = 'repo-collect,repo-vote,repo-rating,comment-vote,repo-comments,repo-videos';
function environment(t, origin, routes = '') {
  for (const [name, value] of Object.entries({ SEFGH_GO_API_URL: origin, SEFGH_GO_ROUTES: routes, NEXT_PUBLIC_SEFGH_GO_DATA: '' })) {
    const old = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
}
test('P7-05 interactions forward to Go without the old switches', async (t) => {
  environment(t, 'https://go.example///');
  const expected = paths.map((path) => ({ source: path, destination: `https://go.example${path}` }));
  for (const routes of ['', 'unknown', oldNames]) {
    process.env.SEFGH_GO_ROUTES = routes;
    const actual = (await config.rewrites()).beforeFiles.filter((route) => paths.includes(route.source));
    assert.deepEqual(actual, expected);
  }
});
test('P7-05 has no Next.js handlers or recorders; a missing origin has no rewrite', async (t) => {
  environment(t, undefined, oldNames);
  for (const path of paths) assert.equal(existsSync(new URL(`../../src/app${path}/route.js`, import.meta.url)), false, path);
  for (const recorder of ['record-repo-collect', 'record-repo-vote', 'record-repo-rating', 'record-comment-vote', 'record-repo-comments', 'record-repo-videos']) {
    assert.equal(existsSync(new URL(`./${recorder}.mjs`, import.meta.url)), false, recorder);
  }
  assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
});
