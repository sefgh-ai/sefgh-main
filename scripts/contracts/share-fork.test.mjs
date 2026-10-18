// POST /api/share/[token]/fork, contract version 1 (SHARE-002). The real
// handler runs with a client built by the real supabase-js around a stand-in
// Supabase; see route-db-fixture.mjs. A Go port must pass the same cases.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runRouteFixture, SUPABASE_KEY } from './route-db-fixture.mjs';
import { sameAnswer } from './engine-message.mjs';
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/share/[token]/fork/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/share-fork/cases.json', import.meta.url), 'utf8'));

test('share fork fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.equal(c.method, 'POST', c.id);
    assert.ok(c.reason, c.id);
    assert.equal(typeof c.params?.token, 'string', c.id);
    // Only a signed-in user reaches the database.
    if (c.expect.status === 401) assert.deepEqual(c.expect.database, [], c.id);
    if (c.expect.status >= 400) assert.ok(Object.keys(c.expect.body).every((key) => key === 'error'), c.id);
    assert.equal(c.expect.cache_control, null, c.id);
    for (const request of c.expect.database) {
      assert.equal(request.apikey, SUPABASE_KEY, c.id);
      // The user's own token: never the public key or a server credential.
      assert.equal(request.authorization, `Bearer ${c.session}`, c.id);
      // The new conversation belongs to the signed-in user, and only to them.
      if (request.method === 'POST') assert.equal(request.body.user_id, c.user.id, c.id);
    }
  }
});

for (const c of contract.cases) {
  test(`share fork: ${c.id} [${c.disposition}]`, async () => {
    sameAnswer(await runRouteFixture(handlers, '/api/share/[token]/fork', c), c);
  });
}
