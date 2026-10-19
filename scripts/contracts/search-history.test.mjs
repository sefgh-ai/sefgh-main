// The browser's search history (src/lib/supabase/search-history.js),
// contract version 1 (DATA-001a, DATA-001b). The module's real functions run
// against a stand-in Supabase; see browser-db-fixture.mjs. Switched to Go,
// the module must send `expect.go_request` and give what Go answers; with no
// Go route (404) it must take its direct path as before. The Go endpoints
// (backend/internal/searchhistory) run the same cases from Go.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { installBrowserClient, runBrowserFixture, runSwitchedFixture, SUPABASE_KEY } from './browser-db-fixture.mjs';
register('./browser-db-loader.mjs', import.meta.url);
installBrowserClient();
const history = await import('../../src/lib/supabase/search-history.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/search-history/cases.json', import.meta.url), 'utf8'));
const AREA = 'search-history';

test('search history fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(typeof history[c.call] === 'function', c.id);
    assert.ok(c.reason, c.id);
    for (const request of c.expect.database) {
      assert.equal(request.apikey, SUPABASE_KEY, c.id);
      // The user's own token, or the public key signed out: never a server credential.
      assert.equal(request.authorization, `Bearer ${c.session ?? SUPABASE_KEY}`, c.id);
      assert.ok(request.path.startsWith('/rest/v1/search_history'), c.id);
    }
    // Go never asks more than the browser module does.
    if (c.go_database) assert.ok(c.go_database.length <= c.expect.database.length, c.id);
    // The module asks Go only when it would have asked the database, and
    // only with the signed-in user's own token, to this site.
    assert.equal(c.expect.go_request === null, c.expect.database.length === 0, c.id);
    if (c.expect.go_request) {
      assert.ok(c.expect.go_request.path.startsWith('/api/search-history'), c.id);
      assert.equal(c.expect.go_request.authorization, c.session ? `Bearer ${c.session}` : null, c.id);
    }
  }
});

for (const c of contract.cases) {
  const { go_request, ...direct } = c.expect;
  test(`search history: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runBrowserFixture(history, c), direct);
  });
  test(`search history via Go: ${c.id}`, async () => {
    const value = 'go_returns' in c ? c.go_returns : c.expect.returns;
    const run = await runSwitchedFixture(history, c, AREA, { status: c.go_status ?? 200, body: value });
    assert.deepEqual(run.go, go_request ? [go_request] : []);
    if (go_request) assert.deepEqual(run.database, [], 'nothing is asked of the database directly');
    if ('throws' in c.expect && !go_request) assert.equal(run.throws, c.expect.throws);
    else assert.deepEqual(run.returns, value);
  });
  if (go_request) {
    test(`search history, Go route missing: ${c.id}`, async () => {
      const run = await runSwitchedFixture(history, c, AREA, { status: 404, body: { error: 'Not Found' } });
      const { go, ...rest } = run;
      assert.deepEqual(go, [go_request]);
      assert.deepEqual(rest, direct, 'the direct path, as with the area off');
    });
  }
}
