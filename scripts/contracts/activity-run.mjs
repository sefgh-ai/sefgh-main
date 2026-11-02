// Answers signed-in activity fixtures read from standard input (a JSON list,
// in the form of contracts/activity/cases.json) with the independent R-059
// reference, and writes them, in the form of `expect`, as one JSON list. The
// Go test TestMatchesNodeOnGeneratedInput compares the Go handler with it on
// generated inputs. The Next.js handler it once ran is retired (P7-04).
//
//   node scripts/contracts/activity-run.mjs < fixtures.json
import { activityAnswer } from './activity-model.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
process.stdout.write(JSON.stringify(JSON.parse(input).map(activityAnswer)));
