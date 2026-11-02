import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import config from '../../next.config.mjs';
const v1Paths = ['/api/v1/keys', '/api/v1/keys/:selector', '/api/v1/search'];
const aiRoutes = { 'ai-suggestions': '/api/ai/suggestions', 'ai-enhance-query': '/api/ai/enhance-query', 'ai-chat': '/api/ai/chat' };
function environment(t, origin, routes = '', ui = '') {
  for (const [name, value] of Object.entries({ SEFGH_GO_API_URL: origin, SEFGH_GO_ROUTES: routes, NEXT_PUBLIC_SEFGH_KEYS_V1: ui })) {
    const old = process.env[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
}
test('P7-09a topics needs the Go origin but no route-name opt-in', async t => {
  environment(t, 'https://go.example///');
  for (const routes of ['', 'unknown', 'trending-topics,trending-topics']) {
    process.env.SEFGH_GO_ROUTES = routes;
    const topics = (await config.rewrites()).beforeFiles.filter(r => r.source === '/api/trending/topics');
    assert.deepEqual(topics, [{ source: '/api/trending/topics', destination: 'https://go.example/api/trending/topics' }]);
  }
});
test('P7-09a v1 forwarding keeps exact UI and origin gates, without a route-name opt-in', async t => {
  environment(t, 'https://go.example///');
  for (const routes of ['', 'unknown', 'playground-keys-v1', 'playground-keys']) {
    process.env.SEFGH_GO_ROUTES = routes;
    for (const ui of ['', '0', 'true', '1 ', '1']) {
      process.env.NEXT_PUBLIC_SEFGH_KEYS_V1 = ui;
      const actual = (await config.rewrites()).beforeFiles.filter(r => r.source.startsWith('/api/v1/'));
      assert.deepEqual(actual, ui === '1' ? v1Paths.map(path => ({ source: path, destination: `https://go.example${path}` })) : [], `${routes}/${ui}`);
    }
  }
});
test('P7-09a preserves exact opt-ins for all three AI routes', async t => {
  environment(t, 'https://go.example///', '', '1');
  assert.deepEqual((await config.rewrites()).beforeFiles.filter(r => r.source.startsWith('/api/ai/')), []);
  for (const [name, path] of Object.entries(aiRoutes)) {
    process.env.SEFGH_GO_ROUTES = ` unknown, ${name}, ${name} `;
    assert.deepEqual((await config.rewrites()).beforeFiles.filter(r => r.source.startsWith('/api/ai/')), [{ source: path, destination: `https://go.example${path}` }]);
  }
});
test('P7-09a has no forwarding without origin and retains the legacy keys handler', async t => {
  environment(t, undefined, 'trending-topics,playground-keys-v1,ai-chat', '1');
  assert.deepEqual(await config.rewrites(), { beforeFiles: [] });
  assert.equal(existsSync(new URL('../../src/app/api/playground/keys/route.js', import.meta.url)), true);
});
