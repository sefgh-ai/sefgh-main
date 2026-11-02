// P7-03: fixture integrity only; Go still executes every endpoint case.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { SUPABASE_KEY } from './route-db-fixture.mjs';
const contract = JSON.parse(await readFile(new URL('../../contracts/share-fork/cases.json', import.meta.url), 'utf8'));

test('share fork fixture integrity', () => {
  assert.equal(contract.contract_version, 2);
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
