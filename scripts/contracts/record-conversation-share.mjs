// Records contracts/conversation-share/cases.json: runs the real POST and
// DELETE handlers of /api/conversations/[id]/share on each case's inputs and
// writes what they answered into the case's `expect`. Inputs and
// dispositions are written by hand; only `expect` is recorded. Review the
// diff before committing.
//
//   node scripts/contracts/record-conversation-share.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { runRouteFixture } from './route-db-fixture.mjs';
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/conversations/[id]/share/route.js');

const file = new URL('../../contracts/conversation-share/cases.json', import.meta.url);
const contract = JSON.parse(await readFile(file, 'utf8'));
for (const c of contract.cases) c.expect = await runRouteFixture(handlers, '/api/conversations/[id]/share', c);
await writeFile(file, JSON.stringify(contract, null, 2) + '\n');
console.log(`recorded ${contract.cases.length} cases`);
