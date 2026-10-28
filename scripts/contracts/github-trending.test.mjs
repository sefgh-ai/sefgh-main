import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runTrendingFixture } from './trending-fixture.mjs';
register('./route-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/github/trending/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/github-trending/cases.json', import.meta.url)));

// Versions 3 and 4 changed only the GitHub query. Version 3 (R-068): the
// search terms are separated by spaces. Version 4 (R-203): the search starts
// at a time, not a date, so "daily" is the last 24 hours. Go sends the fixed
// query. This Next.js handler keeps the version 2 query, joined with "+" and
// starting at a date, until trending is switched to Go and the handler is
// retired: the owner's rule is to fix a backend bug once, in Go. Everything
// else must still match.
const asSentByNext = (expect) => ({
  ...expect,
  calls: expect.calls.map((call) => ({
    ...call,
    url: call.url.replace(/q=([^&]*)/, (_, q) => 'q=' + encodeURIComponent(decodeURIComponent(q)
      .replace(/(created:>\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}Z/, '$1')
      .replace(/ (created|language):/g, '+$1:'))),
  })),
});

test('trending fixture integrity', () => {
  assert.equal(contract.contract_version,4);
  for (const c of contract.cases) {
    for (const call of c.expect.calls) {
      const terms = decodeURIComponent(new URL(call.url).search.match(/q=([^&]*)/)[1]).split(' ');
      assert.ok(terms.length >= 2 && !terms.some((t) => t.includes('+created')), `${c.id}: GitHub reads search terms separated by spaces`);
      assert.ok(terms.some((t) => /^created:>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(t)), `${c.id}: the search starts at a UTC time, not a date (R-203)`);
    }
  }
  assert.equal(new Set(contract.cases.map(c=>c.id)).size,contract.cases.length);
  for(const c of contract.cases) {
    assert.ok(['preserve','defect'].includes(c.disposition),c.id);
    assert.ok(c.reason,c.id);
    // Version 2 (R-020): nothing is random any more.
    assert.equal(c.random,undefined,c.id);
    assert.equal(c.expect.random_calls,0,c.id);
    for (const item of Array.isArray(c.expect.body) ? c.expect.body : []) {
      assert.ok(!("starsToday" in item),c.id);
      assert.ok(item.starsPerDay === null || Number.isInteger(item.starsPerDay),c.id);
      assert.ok([1,2,3].includes(item.heatLevel),c.id);
    }
    if(c.expect.status === 400) assert.equal(c.expect.calls.length,0,c.id);
  }
});
for (const c of contract.cases) {
  test(`trending: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runTrendingFixture(GET,c),asSentByNext(c.expect));
  });
}
