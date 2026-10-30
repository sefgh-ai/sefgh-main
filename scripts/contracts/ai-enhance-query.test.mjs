import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { expand } from './ai-fixture-common.mjs';
import { runEnhanceFixture } from './enhance-fixture.mjs';
register('./route-loader.mjs', import.meta.url);
const { POST } = await import('../../src/app/api/ai/enhance-query/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/ai-enhance-query/cases.json', import.meta.url)));

test('enhance-query fixture integrity and key boundaries', () => {
  assert.equal(contract.contract_version, 4);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(c.reason, c.id);
    assert.ok(c.expect.calls.length <= 1, c.id);
    // Every key in a fixture is an obvious fake, never a real credential.
    for (const value of Object.values(c.env ?? {})) assert.match(value, /^(fixture-[a-z-]+)?$/, c.id);
    if (c.expect.status === 400) assert.equal(c.expect.calls.length, 0, c.id);
    // No reply repeats an internal or provider error.
    if (c.expect.status === 500) assert.deepEqual(c.expect.body, { error: 'Failed to enhance query' }, c.id);
    for (const call of c.expect.calls) {
      const openai = call.url === 'https://api.openai.com/v1/chat/completions';
      const anthropic = call.url === 'https://api.anthropic.com/v1/messages';
      assert.ok(openai || anthropic, c.id);
      // A key only ever goes to the provider it belongs to.
      if (openai) {
        assert.equal(call.headers.authorization, `Bearer ${c.env.OPENAI_API_KEY}`, c.id);
        assert.equal(call.headers['x-api-key'], undefined, c.id);
      } else {
        assert.equal(call.headers['x-api-key'], c.env.ANTHROPIC_API_KEY, c.id);
        assert.equal(call.headers.authorization, undefined, c.id);
      }
    }
  }
});

for (const c of contract.cases) {
  test(`enhance-query: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runEnhanceFixture(POST, c), expand(c.next_expect ?? c.expect));
  });
}
