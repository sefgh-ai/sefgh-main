import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { FIXTURE_TOKEN, runChatFixture } from './chat-fixture.mjs';
register('./route-loader.mjs', import.meta.url);
// src/lib/ai/github.js copies GITHUB_TOKEN when it is imported, so the fake
// has to be in place first. Each test file runs in its own process.
process.env.GITHUB_TOKEN = FIXTURE_TOKEN;
const { POST } = await import('../../src/app/api/ai/chat/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/ai-chat/cases.json', import.meta.url)));

test('chat fixture integrity and provider boundary', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(c.reason, c.id);
    assert.ok(c.expect.calls.length <= 1, c.id);
    if (c.expect.status === 400) assert.equal(c.expect.calls.length, 0, c.id);
    for (const call of c.expect.calls) {
      assert.equal(call.url, 'https://models.inference.ai.azure.com/chat/completions', c.id);
      assert.equal(call.method, 'POST', c.id);
      assert.equal(call.headers.authorization, `Bearer ${FIXTURE_TOKEN}`, c.id);
    }
  }
});

for (const c of contract.cases) {
  test(`chat: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runChatFixture(POST, c), c.expect);
  });
}
