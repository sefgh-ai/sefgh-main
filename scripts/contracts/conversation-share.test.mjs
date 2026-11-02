// P7-03: fixture integrity only; Go still executes every endpoint case.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { SUPABASE_KEY, NOW } from './route-db-fixture.mjs';
const contract = JSON.parse(await readFile(new URL('../../contracts/conversation-share/cases.json', import.meta.url), 'utf8'));

test('conversation share fixture integrity', () => {
  assert.equal(contract.contract_version, 3);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(['POST', 'DELETE'].includes(c.method), c.id);
    assert.ok(c.reason, c.id);
    assert.equal(typeof c.params?.id, 'string', c.id);
    // Only a signed-in user reaches the database.
    if (c.expect.status === 401) assert.deepEqual(c.expect.database, [], c.id);
    // An error answer has one field, the message.
    if (c.expect.status >= 400) assert.ok(Object.keys(c.expect.body).every((key) => key === 'error'), c.id);
    assert.equal(c.expect.cache_control, null, c.id);
    for (const request of c.expect.database) {
      assert.equal(request.apikey, SUPABASE_KEY, c.id);
      // The user's own token: never the public key or a server credential.
      assert.equal(request.authorization, `Bearer ${c.session}`, c.id);
      // Reads name the user, so only their own rows are reached.
      if (request.method === 'GET' && request.path.startsWith('/rest/v1/user_conversations?')) assert.ok(request.path.endsWith(`&user_id=eq.${c.user.id}`), c.id);
      if (request.method === 'GET' && request.path.startsWith('/rest/v1/shared_conversations?')) assert.ok(request.path.includes(`&created_by=eq.${c.user.id}&`), c.id);
      if (request.method === 'PATCH') assert.deepEqual(request.body, { deleted_at: NOW }, c.id);
    }
  }
});
