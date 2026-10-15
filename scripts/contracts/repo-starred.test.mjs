// GET /api/repo/starred, contract version 1 (STAR-001). The real handler
// runs with the Supabase client and GitHub replaced; see
// starred-fixture.mjs. A Go port must pass the same cases. The boundary of
// each GitHub read is pinned separately by contracts/public-repository-reads.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runStarredFixture } from './starred-fixture.mjs';
register('./starred-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/repo/starred/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/repo-starred/cases.json', import.meta.url), 'utf8'));

test('starred fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(c.reason, c.id);
    // Without a signed-in user nothing else is asked.
    if (c.expect.status === 401) assert.deepEqual([c.expect.query, c.expect.github], [[], []], c.id);
    // A failure never carries the database's or the runtime's own words.
    if (c.expect.status === 500) assert.deepEqual(Object.keys(c.expect.body), ['error'], c.id);
    // Every query asks only for the signed-in user's own rows.
    if (c.expect.query.length) assert.deepEqual(c.expect.query[2], ['eq', 'user_id', c.user.id], c.id);
    // GitHub never receives a credential, and redirects are refused.
    for (const call of c.expect.github) assert.deepEqual([call.authorization, call.redirect], [null, 'error'], c.id);
    // A user's collection is never stored by a shared cache.
    if (c.expect.status === 200) assert.equal(c.expect.cache_control, 'private, no-store', c.id);
  }
});

for (const c of contract.cases) {
  test(`starred: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runStarredFixture(GET, c), c.expect);
  });
}
