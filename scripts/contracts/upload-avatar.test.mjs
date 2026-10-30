import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runAvatarFixture, KEY } from './avatar-fixture.mjs';
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/upload-avatar/route.js');
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
for (const c of contract.cases) test(`avatar: ${c.id} [${c.disposition}]`, async () => {
  const actual = await runAvatarFixture(handlers, c);
  // Version 2 (R-041) is Go's; this Next.js handler keeps listing buckets
  // until it is retired, so where it differs the case keeps its answer as
  // next_expect.
  const expected = structuredClone(c.next_expect ?? c.expect);
  if (c.next_engine_message ?? c.engine_message) {
    assert.equal(typeof actual.body.details, 'string'); assert.ok(actual.body.details.length);
    actual.body.details = expected.body.details = '<engine message>';
  }
  assert.deepEqual(actual, expected);
});
