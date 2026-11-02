import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import config from '../../next.config.mjs';
import { PROXY_AREAS } from '../../src/lib/go-areas.mjs';

// Public reads, shares, the user's own reads, repository interactions, the
// avatar upload and the browser's data areas are unconditional since P7-02
// to P7-08b, with their own tests.
// These assertions keep checking the remaining switches independently.
const fixedPaths = ['/api/github/search', '/api/github/languages', '/api/github/trending', '/api/github/trending-developers', '/api/github/repo', '/api/github/repo/:owner/:repo', '/api/github/contents/:owner/:repo', '/api/share/:token', '/api/share/:token/fork', '/api/conversations/:id/share', '/api/activity', '/api/repo/starred', '/api/repo/collect', '/api/repo/vote', '/api/repo/rating', '/api/repo/comments/vote', '/api/repo/comments', '/api/repo/videos', '/api/upload-avatar', '/api/search-history', '/api/search-history/:path*', '/api/onboarding', ...Object.keys(PROXY_AREAS).map((area) => `/api/data/${area}/:path*`)];
async function switchedRewrites() {
  const rewrites = await config.rewrites();
  return { beforeFiles: rewrites.beforeFiles.filter(route => !fixedPaths.includes(route.source)) };
}

test('v1 key forwarding requires route, UI and origin gates together', async () => {
  const names = ['SEFGH_GO_API_URL', 'SEFGH_GO_ROUTES', 'NEXT_PUBLIC_SEFGH_GO_DATA', 'NEXT_PUBLIC_SEFGH_KEYS_V1'];
  const old = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = '';
    process.env.SEFGH_GO_API_URL = 'http://127.0.0.1:8787/';
    process.env.SEFGH_GO_ROUTES = 'playground-keys-v1';
    for (const flag of ['', '0', 'true']) {
      process.env.NEXT_PUBLIC_SEFGH_KEYS_V1 = flag;
      assert.deepEqual(await switchedRewrites(), {beforeFiles: []});
    }
    process.env.NEXT_PUBLIC_SEFGH_KEYS_V1 = '1';
    const paths = ['/api/v1/keys', '/api/v1/keys/:selector', '/api/v1/search'];
    assert.deepEqual(await switchedRewrites(), {beforeFiles: paths.map((path) => ({source: path, destination: `http://127.0.0.1:8787${path}`}))});
    process.env.SEFGH_GO_ROUTES = 'playground-keys';
    assert.deepEqual(await switchedRewrites(), {beforeFiles: []}, 'legacy plaintext route is never forwarded by this switch');
    process.env.SEFGH_GO_ROUTES = 'playground-keys-v1';
    process.env.SEFGH_GO_API_URL = '';
    assert.deepEqual(await switchedRewrites(), {beforeFiles: []});
  } finally {
    for (const name of names) {
      if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name];
    }
  }
});

test('Go routing is opt-in, exact, and independently reversible per route', async () => {
  const oldURL = process.env.SEFGH_GO_API_URL;
  const oldRoutes = process.env.SEFGH_GO_ROUTES;
  const oldData = process.env.NEXT_PUBLIC_SEFGH_GO_DATA;
  delete process.env.NEXT_PUBLIC_SEFGH_GO_DATA;
  try {
    delete process.env.SEFGH_GO_API_URL;
    process.env.SEFGH_GO_ROUTES = 'ai-chat,ai-suggestions';
    assert.deepEqual(await switchedRewrites(), {beforeFiles: []});
    process.env.SEFGH_GO_API_URL = 'http://127.0.0.1:8787///';
    delete process.env.SEFGH_GO_ROUTES;
    assert.deepEqual(await switchedRewrites(), {beforeFiles: []});
    const routes = {
      'ai-suggestions': '/api/ai/suggestions',
      'ai-enhance-query': '/api/ai/enhance-query',
      'ai-chat': '/api/ai/chat',
      'trending-topics': '/api/trending/topics',
    };
    for (const [name, path] of Object.entries(routes)) {
      process.env.SEFGH_GO_ROUTES = ` unknown, ${name}, ${name} `;
      assert.deepEqual(await switchedRewrites(), {beforeFiles: [{source: path, destination: `http://127.0.0.1:8787${path}`}]});
    }
    process.env.SEFGH_GO_ROUTES = 'ai-chat,ai-suggestions';
    assert.equal((await switchedRewrites()).beforeFiles.length, 2);
    process.env.SEFGH_GO_ROUTES = 'ai-suggestions';
    assert.deepEqual(await switchedRewrites(), {beforeFiles: [{source: routes['ai-suggestions'], destination: `http://127.0.0.1:8787${routes['ai-suggestions']}`}]});
  } finally {
    if (oldURL === undefined) delete process.env.SEFGH_GO_API_URL; else process.env.SEFGH_GO_API_URL = oldURL;
    if (oldRoutes === undefined) delete process.env.SEFGH_GO_ROUTES; else process.env.SEFGH_GO_ROUTES = oldRoutes;
    if (oldData === undefined) delete process.env.NEXT_PUBLIC_SEFGH_GO_DATA; else process.env.NEXT_PUBLIC_SEFGH_GO_DATA = oldData;
  }
});

// P7-01: an old deployment setting must not resurrect a retired endpoint.
test('retired contributions has no Next handler or rewrite, even with its stale switch', async () => {
  assert.equal(existsSync(new URL('../../src/app/api/github/contributions/route.js', import.meta.url)), false);
  const names = ['SEFGH_GO_API_URL', 'SEFGH_GO_ROUTES', 'NEXT_PUBLIC_SEFGH_GO_DATA'];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = '';
    process.env.SEFGH_GO_ROUTES = 'github-contributions';
    for (const origin of ['', 'http://127.0.0.1:8787']) {
      process.env.SEFGH_GO_API_URL = origin;
      assert.deepEqual(await switchedRewrites(), { beforeFiles: [] });
    }
  } finally {
    for (const name of names) {
      if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name];
    }
  }
});
