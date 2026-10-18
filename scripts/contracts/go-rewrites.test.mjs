import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../../next.config.mjs';

test('Go routing is opt-in, exact, and independently reversible per route', async () => {
  const oldURL = process.env.SEFGH_GO_API_URL;
  const oldRoutes = process.env.SEFGH_GO_ROUTES;
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
      'github-contributions': '/api/github/contributions',
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
  }
});
