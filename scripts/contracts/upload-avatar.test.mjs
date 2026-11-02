// POST /api/upload-avatar. P7-06: the Next.js handler is retired; Go's
// TestContract (backend/internal/avatar) runs every case.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const KEY = 'public-fixture-key';
const contract = JSON.parse(await readFile(new URL('../../contracts/upload-avatar/cases.json', import.meta.url), 'utf8'));
test('avatar fixture integrity', () => {
  assert.equal(contract.contract_version, 6);
  assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(c.reason); assert.ok(['preserve', 'defect'].includes(c.disposition));
    for (const call of c.expect.database) {
      assert.equal(call.apikey, KEY, c.id);
      assert.equal(call.authorization, `Bearer ${c.session}`, c.id);
      // R-041: Go never lists buckets.
      assert.notEqual(call.path, '/storage/v1/bucket', c.id);
    }
    // R-041: Go never names the setup file that does not exist.
    assert.ok(!JSON.stringify(c.expect.body ?? null).includes('avatar-storage-setup.sql'), c.id);
  }
});

test('cases keep no Next.js-only expectations', () => {
  for (const c of contract.cases) assert.ok(!Object.keys(c).some((key) => key.startsWith('next_')), c.id);
});
