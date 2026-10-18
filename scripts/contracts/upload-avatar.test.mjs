import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runAvatarFixture, KEY } from './avatar-fixture.mjs';
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/upload-avatar/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/upload-avatar/cases.json', import.meta.url), 'utf8'));
test('avatar fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(c.reason); assert.ok(['preserve', 'defect'].includes(c.disposition));
    for (const call of c.expect.database) {
      assert.equal(call.apikey, KEY, c.id);
      assert.equal(call.authorization, `Bearer ${c.session}`, c.id);
    }
  }
});
for (const c of contract.cases) test(`avatar: ${c.id} [${c.disposition}]`, async () => {
  const actual = await runAvatarFixture(handlers, c);
  const expected = structuredClone(c.expect);
  if (c.engine_message) {
    assert.equal(typeof actual.body.details, 'string'); assert.ok(actual.body.details.length);
    actual.body.details = expected.body.details = '<engine message>';
  }
  assert.deepEqual(actual, expected);
});
