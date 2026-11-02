import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import config from '../../next.config.mjs';

test('v1 key forwarding requires route, UI and origin gates together', async () => {
  const names = ['SEFGH_GO_API_URL', 'SEFGH_GO_ROUTES', 'NEXT_PUBLIC_SEFGH_GO_DATA', 'NEXT_PUBLIC_SEFGH_KEYS_V1'];
  const old = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = '';
    process.env.SEFGH_GO_API_URL = 'http://127.0.0.1:8787/';
    process.env.SEFGH_GO_ROUTES = 'playground-keys-v1';
    for (const flag of ['', '0', 'true']) {
      process.env.NEXT_PUBLIC_SEFGH_KEYS_V1 = flag;
      assert.deepEqual(await config.rewrites(), {beforeFiles: []});
    }
    process.env.NEXT_PUBLIC_SEFGH_KEYS_V1 = '1';
    const paths = ['/api/v1/keys', '/api/v1/keys/:selector', '/api/v1/search'];
    assert.deepEqual(await config.rewrites(), {beforeFiles: paths.map((path) => ({source: path, destination: `http://127.0.0.1:8787${path}`}))});
    process.env.SEFGH_GO_ROUTES = 'playground-keys';
    assert.deepEqual(await config.rewrites(), {beforeFiles: []}, 'legacy plaintext route is never forwarded by this switch');
    process.env.SEFGH_GO_ROUTES = 'playground-keys-v1';
    process.env.SEFGH_GO_API_URL = '';
    assert.deepEqual(await config.rewrites(), {beforeFiles: []});
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
    process.env.SEFGH_GO_ROUTES = 'github-repo,github-repo-details,github-contents';
    assert.deepEqual(await config.rewrites(), {beforeFiles: []});
    process.env.SEFGH_GO_API_URL = 'http://127.0.0.1:8787///';
    delete process.env.SEFGH_GO_ROUTES;
    assert.deepEqual(await config.rewrites(), {beforeFiles: []});
    const routes = {
      'github-search': '/api/github/search',
      'github-languages': '/api/github/languages',
      'github-trending': '/api/github/trending',
      'github-trending-developers': '/api/github/trending-developers',
      'github-repo': '/api/github/repo',
      'github-repo-details': '/api/github/repo/:owner/:repo',
      'github-contents': '/api/github/contents/:owner/:repo',
      'ai-suggestions': '/api/ai/suggestions',
      'ai-enhance-query': '/api/ai/enhance-query',
      'ai-chat': '/api/ai/chat',
      'activity': '/api/activity',
      'repo-starred': '/api/repo/starred',
      'share-token': '/api/share/:token',
      'repo-collect': '/api/repo/collect',
      'repo-vote': '/api/repo/vote',
      'repo-rating': '/api/repo/rating',
      'comment-vote': '/api/repo/comments/vote',
      'repo-comments': '/api/repo/comments',
      'repo-videos': '/api/repo/videos',
      'conversation-share': '/api/conversations/:id/share',
      'share-fork': '/api/share/:token/fork',
      'upload-avatar': '/api/upload-avatar',
      'trending-topics': '/api/trending/topics',
    };
    for (const [name, path] of Object.entries(routes)) {
      process.env.SEFGH_GO_ROUTES = ` unknown, ${name}, ${name} `;
      assert.deepEqual(await config.rewrites(), {beforeFiles: [{source: path, destination: `http://127.0.0.1:8787${path}`}]});
    }
    process.env.SEFGH_GO_ROUTES = 'github-repo-details,github-contents';
    assert.equal((await config.rewrites()).beforeFiles.length, 2);
    process.env.SEFGH_GO_ROUTES = 'github-contents';
    assert.deepEqual(await config.rewrites(), {beforeFiles: [{source: routes['github-contents'], destination: `http://127.0.0.1:8787${routes['github-contents']}`}]});
  } finally {
    if (oldURL === undefined) delete process.env.SEFGH_GO_API_URL; else process.env.SEFGH_GO_API_URL = oldURL;
    if (oldRoutes === undefined) delete process.env.SEFGH_GO_ROUTES; else process.env.SEFGH_GO_ROUTES = oldRoutes;
    if (oldData === undefined) delete process.env.NEXT_PUBLIC_SEFGH_GO_DATA; else process.env.NEXT_PUBLIC_SEFGH_GO_DATA = oldData;
  }
});

// A browser data area (DATA-001b) is switched by NEXT_PUBLIC_SEFGH_GO_DATA,
// the setting its browser module reads, and only when the Go server's
// address is set; the route switches do not affect it.
test('browser data areas are rewritten by the same setting their modules read', async () => {
  const old = { url: process.env.SEFGH_GO_API_URL, routes: process.env.SEFGH_GO_ROUTES, data: process.env.NEXT_PUBLIC_SEFGH_GO_DATA };
  const history = [
    { source: '/api/search-history', destination: 'http://127.0.0.1:8787/api/search-history' },
    { source: '/api/search-history/:path*', destination: 'http://127.0.0.1:8787/api/search-history/:path*' },
  ];
  try {
    delete process.env.SEFGH_GO_ROUTES;
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = 'search-history';
    delete process.env.SEFGH_GO_API_URL;
    assert.deepEqual(await config.rewrites(), { beforeFiles: [] }, 'no Go address, no rewrite: the module falls back on the 404');
    process.env.SEFGH_GO_API_URL = 'http://127.0.0.1:8787/';
    assert.deepEqual(await config.rewrites(), { beforeFiles: history });
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = ' unknown , search-history ';
    assert.deepEqual(await config.rewrites(), { beforeFiles: history });
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = 'onboarding,search-history';
    assert.deepEqual(await config.rewrites(), { beforeFiles: [...history, { source: '/api/onboarding', destination: 'http://127.0.0.1:8787/api/onboarding' }] });
    process.env.NEXT_PUBLIC_SEFGH_GO_DATA = '';
    process.env.SEFGH_GO_ROUTES = 'search-history';
    assert.deepEqual(await config.rewrites(), { beforeFiles: [] }, 'the route list does not switch a data area');
  } finally {
    for (const [name, value] of [['SEFGH_GO_API_URL', old.url], ['SEFGH_GO_ROUTES', old.routes], ['NEXT_PUBLIC_SEFGH_GO_DATA', old.data]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
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
      assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
    }
  } finally {
    for (const name of names) {
      if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name];
    }
  }
});
