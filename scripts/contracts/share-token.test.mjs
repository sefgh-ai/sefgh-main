// P7-03: fixture integrity only; Go still executes every endpoint case.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { SUPABASE_KEY } from './route-db-fixture.mjs';
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
