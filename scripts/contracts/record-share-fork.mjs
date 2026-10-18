// Records contracts/share-fork/cases.json: runs the real POST handler of
// /api/share/[token]/fork on each case's inputs and writes what it answered
// into the case's `expect`. Inputs and dispositions are written by hand;
// only `expect` is recorded. Review the diff before committing.
//
//   node scripts/contracts/record-share-fork.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { runRouteFixture } from './route-db-fixture.mjs';
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/share/[token]/fork/route.js');

const file = new URL('../../contracts/share-fork/cases.json', import.meta.url);
const contract = JSON.parse(await readFile(file, 'utf8'));
for (const c of contract.cases) c.expect = await runRouteFixture(handlers, '/api/share/[token]/fork', c);
await writeFile(file, JSON.stringify(contract, null, 2) + '\n');
console.log(`recorded ${contract.cases.length} cases`);
