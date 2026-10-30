import { runContributionsFixture } from './contributions-fixture.mjs';
// Replays contracts/github-contributions/cases.json against the real Next.js
// handler. Each case fixes GitHub's reply, the clock and the server time zone,
// because the handler derives its date range from all three.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('./route-loader.mjs', import.meta.url);
const { GET } = await import(new URL('../../src/app/api/github/contributions/route.js', import.meta.url).href);
const contract = JSON.parse(await readFile(new URL('../../contracts/github-contributions/cases.json', import.meta.url), 'utf8'));
const RealDate = Date;

test('contribution cases are well formed', () => {
  assert.equal(contract.contract_version,4);
  assert.ok(contract.cases.length > 0);
  assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(!Number.isNaN(RealDate.parse(c.now)), `${c.id}: now`);
    for (const call of c.calls) assert.equal(call.url, contract.graphql_url, c.id);
  }
});

test('UTC dates, current-day streak and user-not-found controls are pinned (R-033)', () => {
  for (const c of contract.cases) for (const call of c.calls) {
    const start = new RealDate(c.now);
    start.setUTCDate(start.getUTCDate()-365);
    start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);
    assert.equal(call.variables.from,start.toISOString(),c.id);
    assert.equal(call.variables.to,new RealDate(c.now).toISOString(),c.id);
  }
  const byId = id => contract.cases.find(c => c.id===id);
  for (const [id,count] of Object.entries({'streak-zero-when-newest-day-is-empty':2,'streak-gap-break':1,
    'streak-stale-calendar':0,'streak-future-ignored':1,'streak-no-today':2,'streak-yesterday-empty':0,
    'streak-utc-midnight-india':2,'streak-utc-midnight-pacific':2})) {
    assert.equal(byId(id).expect.body.stats.currentStreak,count,id);
  }
  assert.equal(byId('graphql-user-does-not-exist').expect.status,404);
  for (const id of ['graphql-mixed-notfound-errors','graphql-notfound-other-path','graphql-notfound-without-path']) assert.equal(byId(id).expect.status,400,id);
});

for (const c of contract.cases) {
  test(`contributions: ${c.id} [${c.disposition}]`,async () => {
    const actual = await runContributionsFixture(GET,c);
    const expect = c.next_expect ?? c.expect;
    assert.equal(actual.status,expect.status);
    assert.deepEqual(actual.body,expect.body);
    assert.equal(actual.content_type,'application/json');
    assert.equal(actual.cache_control,c.github_token ? 'private, no-store' : null);
    assert.equal(actual.retry_after,null);
    assert.deepEqual(actual.calls,(c.next_calls ?? c.calls).map(call => ({
      url:call.url,method:call.method,headers:call.headers,body:{query:contract.query,variables:call.variables},
    })));
  });
}
