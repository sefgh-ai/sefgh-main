// Records contracts/repo-collect/cases.json: runs the real GET, POST and
// DELETE handlers of /api/repo/collect on each case's inputs and writes what
// they answered into the case's `expect`. Inputs and dispositions are written
// by hand; only `expect` is recorded. Review the diff before committing.
//
//   node scripts/contracts/record-repo-collect.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { runCollectFixture } from './collect-fixture.mjs';
register('./collect-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/repo/collect/route.js');

const file = new URL('../../contracts/repo-collect/cases.json', import.meta.url);
const contract = JSON.parse(await readFile(file, 'utf8'));
for (const c of contract.cases) c.expect = await runCollectFixture(handlers, c);
await writeFile(file, JSON.stringify(contract, null, 2) + '\n');
console.log(`recorded ${contract.cases.length} cases`);
