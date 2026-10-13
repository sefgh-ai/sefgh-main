import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runTrendingFixture } from './trending-fixture.mjs';
register('./route-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/github/trending/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/github-trending/cases.json', import.meta.url)));

test('trending fixture integrity', () => {
  assert.equal(contract.contract_version,1);
  assert.equal(new Set(contract.cases.map(c=>c.id)).size,contract.cases.length);
  for(const c of contract.cases) {
    assert.ok(['preserve','defect'].includes(c.disposition),c.id);
    assert.ok(c.reason,c.id);
    assert.ok(c.random >= 0 && c.random < 1,c.id);
    if(c.expect.status === 400) assert.equal(c.expect.calls.length,0,c.id);
  }
});
for (const c of contract.cases) {
  test(`trending: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runTrendingFixture(GET,c),c.expect);
  });
}
