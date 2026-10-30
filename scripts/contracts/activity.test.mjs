// GET /api/activity, contract version 3 (BUG-038): the first Phase 3
// characterization. The real handler runs with the Supabase client, the clock
// and the server time zone replaced; see activity-fixture.mjs. A Go port must
// pass the same cases.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runActivityFixture } from './activity-fixture.mjs';
register('./activity-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/activity/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/activity/cases.json', import.meta.url), 'utf8'));

test('activity fixture integrity', () => {
  assert.equal(contract.contract_version, 4);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(c.reason, c.id);
    // Without a signed-in user the database is never asked.
    if (c.expect.status === 401) assert.deepEqual(c.expect.query, [], c.id);
    // R-056: no reply carries the database's or the runtime's own words.
    assert.ok(!('details' in c.expect.body), c.id);
    if (c.expect.status === 500) assert.deepEqual(Object.keys(c.expect.body), ['error'], c.id);
    // Every query asks only for the signed-in user's own rows.
    if (c.expect.query.length) assert.deepEqual(c.expect.query[2], ['eq', 'user_id', c.user.id], c.id);
    for (const [i, query] of (c.go_queries ?? []).entries()) {
      assert.deepEqual(query[2], ['eq', 'user_id', c.user.id], c.id);
      assert.deepEqual(query.slice(-3), [
        ['order', 'activity_date,activity_type', { ascending: true }],
        ['limit', 1000], ['offset', i * 1000],
      ], c.id);
    }
  }
});

test('activity pagination fixtures cover a full page, overflow and later-page failure', () => {
  const byId = Object.fromEntries(contract.cases.map((c) => [c.id, c]));
  for (const id of ['over-one-page', 'exactly-one-page', 'later-page-fails']) {
    assert.equal(byId[id].go_queries.length, 2, id);
    assert.ok(byId[id].next_expect, id);
  }
  assert.equal(byId['over-one-page'].rows.length, 1001);
  assert.equal(byId['over-one-page'].expect.body.stats.totalContributions, 1001);
  assert.equal(byId['over-one-page'].next_expect.body.stats.totalContributions, 1000);
  assert.equal(byId['later-page-fails'].expect.status, 500);
  assert.equal(byId['later-page-fails'].next_expect.status, 200);
});

// R-057: a server's time zone no longer changes the range or the days.
test('the same instant gives the same reply whatever the server time zone', () => {
  const byId = Object.fromEntries(contract.cases.map((c) => [c.id, c]));
  for (const id of ['server-in-india', 'server-in-new-york']) {
    assert.deepEqual(byId[id].expect, byId['some-activity'].expect, id);
  }
  for (const c of contract.cases) {
    for (const week of c.expect.body.grid ?? []) {
      for (const [date, , , , dayOfWeek] of week) {
        if (date) assert.equal(new Date(`${date}T00:00:00Z`).getUTCDay(), dayOfWeek, `${c.id} ${date}`);
      }
    }
  }
});

for (const c of contract.cases) {
  test(`activity: ${c.id} [${c.disposition}]`, async () => {
    // Version 2 (R-063) is Go's; this Next.js handler answers next_expect
    // until it is retired.
    assert.deepEqual(await runActivityFixture(GET, c), c.next_expect ?? c.expect);
  });
}
