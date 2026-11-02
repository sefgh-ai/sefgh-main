// The browser's onboarding (src/lib/supabase/onboarding.js), contract
// version 1 (DATA-002). The module's real functions run against a stand-in
// Supabase; see browser-db-fixture.mjs. Switched to Go, the module asks for
// each database call's result, { data, error }: it must send
// `expect.go_requests` and, given `expect.go_answers`, reach
// `expect.go_outcome`, whatever NEXT_PUBLIC_SEFGH_GO_DATA says: its direct
// path was retired in P7-08a. `expect.database` stays: the Go endpoints
// (backend/internal/onboarding) run the same cases from Go.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { installBrowserClient, runSwitchedFixture, SUPABASE_KEY } from './browser-db-fixture.mjs';
register('./browser-db-loader.mjs', import.meta.url);
installBrowserClient();
const onboarding = await import('../../src/lib/supabase/onboarding.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/onboarding/cases.json', import.meta.url), 'utf8'));
// P7-08a: the area is not switched on, and the module asks Go anyway.
const AREA = '';
const outcome = (run) => ('throws' in run ? { throws: run.throws } : { returns: run.returns });

test('onboarding fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(typeof onboarding[c.call] === 'function', c.id);
    assert.ok(c.reason, c.id);
    for (const request of c.expect.database) {
      assert.equal(request.apikey, SUPABASE_KEY, c.id);
      assert.equal(request.authorization, `Bearer ${c.session ?? SUPABASE_KEY}`, c.id);
      assert.ok(request.path.startsWith('/rest/v1/onboarding_data'), c.id);
    }
    // One Go request for each database call, to this site, with the user's own token.
    assert.equal(c.expect.go_requests.length, c.expect.database.length, c.id);
    assert.equal(c.expect.go_answers.length, c.expect.go_requests.length, c.id);
    for (const request of c.expect.go_requests) {
      assert.ok(request.path.startsWith('/api/onboarding'), c.id);
      assert.equal(request.authorization, c.session ? `Bearer ${c.session}` : null, c.id);
    }
    // Through Go the caller sees what it saw before, unless the case says Go answers differently.
    if (!c.go_answers && !c.go_status) assert.deepEqual(c.expect.go_outcome, outcome(c.expect), c.id);
  }
});

for (const c of contract.cases) {
  const { go_requests, go_answers, go_outcome } = c.expect;
  test(`onboarding via Go: ${c.id}`, async () => {
    const run = await runSwitchedFixture(onboarding, c, AREA, go_answers.map((body) => ({ status: c.go_status ?? 200, body })));
    assert.deepEqual(run.go, go_requests);
    assert.deepEqual(run.database, [], 'nothing is asked of the database directly');
    assert.deepEqual(outcome(run), go_outcome);
  });
  test(`onboarding, Go route missing: ${c.id}`, async () => {
    const missing = await runSwitchedFixture(onboarding, c, AREA, { status: 404, body: { error: 'Not Found' } });
    const refused = await runSwitchedFixture(onboarding, c, AREA, { status: 500, body: { error: 'Not Found' } });
    assert.ok(missing.go.length >= 1);
    assert.deepEqual(missing.database, [], 'never the database directly');
    assert.deepEqual(missing, refused, 'a missing route is an ordinary failure');
  });
}
