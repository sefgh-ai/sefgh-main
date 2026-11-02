// P7-02: the catalog contract stays; only Go serves it.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const fixtures = new URL('../../contracts/github-languages/', import.meta.url);
const contract = JSON.parse(await readFile(new URL('cases.json', fixtures), 'utf8'));
test('language fixture ids and embedded Go catalog stay intact', async () => {
  assert.ok(contract.cases.length > 0);
  assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
  const catalog = JSON.parse(await readFile(new URL('../../backend/internal/githublanguages/catalog.json', import.meta.url), 'utf8'));
  for (const c of contract.cases) {
    assert.deepEqual(catalog, JSON.parse(await readFile(new URL(c.expect.body_file, fixtures), 'utf8')));
  }
});
