// Records contracts/repo-starred/cases.json: runs the real
// GET /api/repo/starred handler on each case's inputs and writes what it
// answered into the case's `expect`. Inputs and dispositions are written by
// hand; only `expect` is recorded. Review the diff before committing.
//
//   node scripts/contracts/record-repo-starred.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { runStarredFixture } from './starred-fixture.mjs';
register('./starred-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/repo/starred/route.js');

const file = new URL('../../contracts/repo-starred/cases.json', import.meta.url);
const contract = JSON.parse(await readFile(file, 'utf8'));
for (const c of contract.cases) c.expect = await runStarredFixture(GET, c);
await writeFile(file, JSON.stringify(contract, null, 2) + '\n');
console.log(`recorded ${contract.cases.length} cases`);
