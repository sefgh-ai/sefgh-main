// Records contracts/onboarding/cases.json: runs the real functions of
// src/lib/supabase/onboarding.js on each case's inputs (the direct path),
// works out with the real postgrest-js what Go must answer to each database
// call ({ data, error }), then runs them again switched to Go with those
// answers and records the requests sent there and the outcome. Inputs and
// dispositions are written by hand; only `expect` is recorded. Review the
// diff before committing.
//
//   node scripts/contracts/record-onboarding.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { installBrowserClient, runBrowserFixture, runSwitchedFixture, postgrestResult } from './browser-db-fixture.mjs';
register('./browser-db-loader.mjs', import.meta.url);
installBrowserClient();
const onboarding = await import('../../src/lib/supabase/onboarding.js');

const file = new URL('../../contracts/onboarding/cases.json', import.meta.url);
const contract = JSON.parse(await readFile(file, 'utf8'));
for (const c of contract.cases) {
  c.expect = await runBrowserFixture(onboarding, c);
  const answers = c.go_answers ?? (await Promise.all(c.database.slice(0, c.expect.database.length).map(postgrestResult)));
  const switched = await runSwitchedFixture(onboarding, c, 'onboarding', answers.map((body) => ({ status: c.go_status ?? 200, body })));
  c.expect.go_requests = switched.go;
  c.expect.go_answers = answers;
  c.expect.go_outcome = 'throws' in switched ? { throws: switched.throws } : { returns: switched.returns };
}
await writeFile(file, JSON.stringify(contract, null, 2) + '\n');
console.log(`recorded ${contract.cases.length} cases`);
