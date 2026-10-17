// GET, POST and DELETE /api/repo/videos, contract version 1
// (VIDEOS-001). The real handlers run with a client built by the real
// supabase-js around a stand-in Supabase; see route-db-fixture.mjs. A Go port
// must pass the same cases; GET's requests may come in any order.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runRouteFixture, SUPABASE_KEY } from './route-db-fixture.mjs';
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/repo/videos/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/repo-videos/cases.json', import.meta.url), 'utf8'));

test('videos fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(['GET', 'POST', 'DELETE'].includes(c.method), c.id);
    assert.ok(c.reason, c.id);
    // Nothing is asked before sign-in and the input checks.
    if ([400, 401].includes(c.expect.status)) assert.deepEqual(c.expect.database, [], c.id);
    // A failure never carries the database's own words.
    if (c.expect.status >= 400) assert.deepEqual(Object.keys(c.expect.body), ['error'], c.id);
    assert.equal(c.expect.cache_control, null, c.id);
    for (const request of c.expect.database) {
      assert.equal(request.apikey, SUPABASE_KEY, c.id);
      if (request.path.startsWith('/auth/v1/admin/')) {
        // The admin lookup (R-040) goes with the public key, never a user's
        // token, and so is refused.
        assert.equal(request.authorization, `Bearer ${SUPABASE_KEY}`, c.id);
        continue;
      }
      assert.ok(/^\/rest\/v1\/(repo_videos|profiles)\?/.test(request.path), c.id);
      // The visitor's own token, or the public key: never a server credential.
      assert.equal(request.authorization, `Bearer ${c.session ?? SUPABASE_KEY}`, c.id);
      // A write names the signed-in user, and only that user.
      if (request.method === 'POST') assert.equal(request.body.uploaded_by, c.user.id, c.id);
      if (request.method === 'DELETE') assert.ok(request.path.endsWith(`&uploaded_by=eq.${c.user.id}`), c.id);
    }
  }
});

for (const c of contract.cases) {
  test(`videos: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runRouteFixture(handlers, '/api/repo/videos', c), c.expect);
  });
}
