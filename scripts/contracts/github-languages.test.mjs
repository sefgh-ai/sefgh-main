import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('./route-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/github/languages/route.js');
const fixtures = new URL('../../contracts/github-languages/', import.meta.url);
const contract = JSON.parse(await readFile(new URL('cases.json', fixtures), 'utf8'));

test('language case ids are unique and nonempty', () => {
  assert.ok(contract.cases.length > 0);
  assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
});

for (const c of contract.cases) {
  test(`languages: ${c.id}`, async () => {
    const expected = JSON.parse(await readFile(new URL(c.expect.body_file, fixtures), 'utf8'));
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error('catalog must not call upstream'); };
    try {
      const response = await GET(new Request(`http://localhost${c.request}`));
      assert.equal(response.status, c.expect.status);
      assert.deepEqual(await response.json(), expected); // Order and duplicates matter.
      for (const [name, value] of Object.entries(c.expect.headers)) {
        assert.equal(response.headers.get(name), value, name);
      }
      assert.equal(calls, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
