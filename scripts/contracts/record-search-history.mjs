// Records contracts/search-history/cases.json: runs the real functions of
// src/lib/supabase/search-history.js on each case's inputs and writes what
// they returned and asked into the case's `expect`, then runs them again with
// the area switched to Go and records the request they send there
// (`expect.go_request`). Inputs and dispositions are written by hand; only
// `expect` is recorded. Review the diff before committing.
//
//   node scripts/contracts/record-search-history.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { installBrowserClient, runBrowserFixture, runSwitchedFixture } from './browser-db-fixture.mjs';
register('./browser-db-loader.mjs', import.meta.url);
installBrowserClient();
const history = await import('../../src/lib/supabase/search-history.js');

const file = new URL('../../contracts/search-history/cases.json', import.meta.url);
const contract = JSON.parse(await readFile(file, 'utf8'));
for (const c of contract.cases) {
  c.expect = await runBrowserFixture(history, c);
  const value = 'go_returns' in c ? c.go_returns : c.expect.returns;
  const switched = await runSwitchedFixture(history, c, 'search-history', { status: 200, body: value });
  c.expect.go_request = switched.go[0] ?? null;
}
await writeFile(file, JSON.stringify(contract, null, 2) + '\n');
console.log(`recorded ${contract.cases.length} cases`);
