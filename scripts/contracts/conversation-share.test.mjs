// POST and DELETE /api/conversations/[id]/share, contract version 1
// (SHARE-002). The real handlers run with a client built by the real
// supabase-js around a stand-in Supabase; see route-db-fixture.mjs. A Go port
// must pass the same cases.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runRouteFixture, SUPABASE_KEY, NOW } from './route-db-fixture.mjs';
import { sameAnswer } from './engine-message.mjs';
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/conversations/[id]/share/route.js');
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

for (const c of contract.cases) {
  test(`conversation share: ${c.id} [${c.disposition}]`, async () => {
    sameAnswer(await runRouteFixture(handlers, '/api/conversations/[id]/share', c), { ...c, expect: c.next_expect ?? c.expect, engine_message: c.next_engine_message ?? c.engine_message });
  });
}
