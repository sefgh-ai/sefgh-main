import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {register} from 'node:module';
import {test} from 'node:test';
import {expand} from './ai-fixture-common.mjs';
import {runSuggestionsFixture} from './suggestions-fixture.mjs';
register('./ai-suggestions-loader.mjs',import.meta.url);
const {POST}=await import('../../src/app/api/ai/suggestions/route.js');
const contract=JSON.parse(await readFile(new URL('../../contracts/ai-suggestions/cases.json',import.meta.url)));
test('AI suggestions fixture integrity',()=>{
  assert.equal(contract.contract_version,2);
  assert.equal(new Set(contract.cases.map(c=>c.id)).size,contract.cases.length);
  for(const c of contract.cases){
    assert.ok(c.reason);assert.ok(['preserve','defect'].includes(c.disposition));assert.ok(c.expect.calls.length<=1);
    if(c.expect.status===400) assert.equal(c.expect.calls.length,0,c.id);
    // No reply repeats an internal or provider error.
    if(c.expect.status===500) assert.deepEqual(c.expect.body,{error:'Failed to generate suggestions'},c.id);
  }
});
for(const c of contract.cases)test(`suggestions: ${c.id} [${c.disposition}]`,async()=>{
  assert.deepEqual(await runSuggestionsFixture(POST,c),expand(c.expect));
});
