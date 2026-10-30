// GET /api/share/[token], contract version 1 (SHARE-001). The real handler
// runs with a client built by the real supabase-js around a stand-in Data
// API; see share-fixture.mjs. A Go port must pass the same cases.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runShareFixture, SUPABASE_KEY } from './share-fixture.mjs';
register('./share-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/share/[token]/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/share-token/cases.json', import.meta.url), 'utf8'));

const COLUMNS = 'select=id%2Cshare_token%2Cis_public%2Ctitle%2Csummary%2Csnapshot%2Cshared_at';

test('share fixture integrity', () => {
  assert.equal(contract.contract_version, 3);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(c.reason, c.id);
    assert.deepEqual(Object.keys(c.expect.body).length, 1, c.id);
    if (c.expect.status === 200) assert.deepEqual(Object.keys(c.expect.body), ['share'], c.id);
    else assert.deepEqual(Object.keys(c.expect.body), ['error'], c.id);
    if (c.client_throws) {
      assert.deepEqual(c.expect.database, [], c.id);
      continue;
    }
    // One request, for this token only, for rows that are not deleted.
    assert.equal(c.expect.database.length, 1, c.id);
    const [request] = c.expect.database;
    const token = new URLSearchParams({ share_token: `eq.${c.token}` }).toString();
    assert.equal(request.path, `/rest/v1/shared_conversations?${COLUMNS}&${token}&deleted_at=is.null`, c.id);
    assert.equal(request.accept, 'application/vnd.pgrst.object+json', c.id);
    assert.equal(request.apikey, SUPABASE_KEY, c.id);
    // The visitor's own token, or the public key when signed out: never a
    // server credential.
    assert.equal(request.authorization, `Bearer ${c.session ?? SUPABASE_KEY}`, c.id);
  }
});

for (const c of contract.cases) {
  test(`share: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runShareFixture(GET, c), c.next_expect ?? c.expect);
  });
}
