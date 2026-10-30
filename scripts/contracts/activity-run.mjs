// Runs the real GET /api/activity handler on fixtures read from standard
// input (a JSON list, in the form of contracts/activity/cases.json) and
// writes what it answered for each, in the form of `expect`, as one JSON
// list. The Go test TestMatchesNodeOnGeneratedInput uses it to compare the
// Go port with the independent approved R-059 reference on generated inputs.
// The real Next handler still supplies unaffected response/query fields.
//
//   node scripts/contracts/activity-run.mjs < fixtures.json
import { register } from 'node:module';
import { activityModel } from './activity-model.mjs';
import { runActivityFixture } from './activity-fixture.mjs';
register('./activity-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/activity/route.js');

let input = '';
for await (const chunk of process.stdin) input += chunk;
const results = [];
for (const fixture of JSON.parse(input)) results.push(activityModel(fixture, await runActivityFixture(GET, fixture)));
process.stdout.write(JSON.stringify(results));
