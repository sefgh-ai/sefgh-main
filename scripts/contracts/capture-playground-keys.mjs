// Explicit recorder for the unchanged legacy boundary; fixtures/entropy only.
// Review every diff before accepting a changed contract.
import { readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { runKeyFixture } from './playground-keys-fixture.mjs';

if (process.argv[2] !== '--write' || process.argv.length !== 3) {
  throw new Error('explicit --write required; review resulting fixture diff');
}
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/playground/keys/route.js');
const file = new URL('../../contracts/playground-keys/cases.json', import.meta.url);
const contract = JSON.parse(await readFile(file, 'utf8'));
for (const fixture of contract.cases) fixture.expect = await runKeyFixture(handlers, fixture);
await writeFile(file, `${JSON.stringify(contract, null, 2)}\n`);
console.log(`Recorded ${contract.cases.length} synthetic legacy cases; review every changed expectation.`);
