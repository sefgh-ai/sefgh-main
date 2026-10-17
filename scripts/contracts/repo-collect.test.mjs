// GET, POST and DELETE /api/repo/collect, contract version 1 (COLLECT-001).
// The real handlers run with a client built by the real supabase-js around
// a stand-in Data API; see collect-fixture.mjs. A Go port must pass the same
// cases.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runCollectFixture, SUPABASE_KEY } from './collect-fixture.mjs';
register('./collect-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/repo/collect/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/repo-collect/cases.json', import.meta.url), 'utf8'));

test('collect fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(['GET', 'POST', 'DELETE'].includes(c.method), c.id);
    assert.ok(c.reason, c.id);
    // Nothing is asked of the database before sign-in and the input check.
    if ([400, 401].includes(c.expect.status)) assert.deepEqual(c.expect.database, [], c.id);
    // A failure never carries the database's own words.
    if (c.expect.status >= 400) assert.deepEqual(Object.keys(c.expect.body), ['error'], c.id);
    assert.equal(c.expect.cache_control, null, c.id);
    for (const request of c.expect.database) {
      assert.ok(request.path.startsWith('/rest/v1/repo_collections'), c.id);
      assert.equal(request.apikey, SUPABASE_KEY, c.id);
      // The visitor's own token, or the public key: never a server credential.
      assert.equal(request.authorization, `Bearer ${c.session ?? SUPABASE_KEY}`, c.id);
      // A write names the signed-in user, and only that user.
      if (request.method === 'POST') assert.equal(request.body.user_id, c.user.id, c.id);
      if (request.method === 'DELETE') assert.ok(request.path.includes(`?user_id=eq.${c.user.id}&`), c.id);
    }
  }
});

for (const c of contract.cases) {
  test(`collect: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runCollectFixture(handlers, c), c.expect);
  });
}
