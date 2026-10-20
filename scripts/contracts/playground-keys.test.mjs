import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runKeyFixture } from './playground-keys-fixture.mjs';

register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/playground/keys/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/playground-keys/cases.json', import.meta.url), 'utf8'));

test('legacy playground-key fixture integrity', () => {
  assert.equal(contract.contract_version, 2);
  assert.equal(contract.implementation, 'legacy-next-plaintext');
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(c.reason, c.id);
    assert.equal(c.method, 'POST');
    assert.equal(c.expect.cache_control, 'no-store', c.id);
    for (const query of c.expect.database) {
      assert.equal(query.method, 'POST');
      assert.match(query.path, /^\/rest\/v1\/api_keys\?/);
      assert.equal(query.body[0]?.user_id ?? query.body.user_id, c.user.id, c.id);
      assert.equal(query.authorization, `Bearer ${c.session}`, c.id);
      assert.match(query.body[0]?.key ?? query.body.key, /^sk_[0-9a-f]{64}$/, c.id);
    }
  }
});

for (const fixture of contract.cases) {
  test(`legacy playground keys: ${fixture.id} [${fixture.disposition}]`, async () => {
    assert.deepEqual(await runKeyFixture(handlers, fixture), fixture.expect);
  });
}

test('key issuance is no-store and never logs database credential details', async () => {
  const success = contract.cases.find((c) => c.id === 'created-plaintext');
  assert.equal((await runKeyFixture(handlers, success)).cache_control, 'no-store');
  const failure = await runKeyFixture(handlers, contract.cases.find((c) => c.id === 'database-error-log-privacy'));
  assert.equal(failure.cache_control, 'no-store');
  assert.deepEqual(failure.errors, [['API key creation failed']]);
});

test('failed key creation logs a fixed event without the provider payload', async () => {
  const failure = await runKeyFixture(handlers, contract.cases.find((c) => c.id === 'database-error-log-privacy'));
  assert.deepEqual(failure.errors, [['API key creation failed']]);
});
