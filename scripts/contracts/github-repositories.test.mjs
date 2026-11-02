// P7-02: fixture integrity only; Go runs every endpoint case.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const contract = JSON.parse(await readFile(new URL('../../contracts/github-repositories/cases.json', import.meta.url), 'utf8'));

test('repository case ids are unique', () => {
  assert.equal(contract.contract_version,6);
  assert.equal(new Set(contract.cases.map(c => c.id)).size, contract.cases.length);
});

test('repository wire URLs match Node normalization', () => {
  for (const c of contract.cases) {
    for (const call of [...c.calls, ...(c.go_calls ?? [])]) {
      const normalized = new URL(call.url);
      normalized.hash = '';
      assert.equal(call.wire_url, normalized.href, `${c.id}: ${call.url}`);
    }
  }
});

test('success shape cases distinguish invalid data from legitimate nulls (R-030)', () => {
  const byId = id => contract.cases.find(c => c.id === id);
  for (const id of ['summary-missing-fields','summary-null-owner','summary-text-id','contents-null-body','contents-boolean-success','detail-null-languages','detail-array-languages']) {
    assert.equal(byId(id).expect.status,502,id);
  }
  const nullable = byId('summary-nullable-control').expect.body;
  for (const field of ['description','language','license']) assert.equal(nullable[field],null,field);
  const optional = byId('summary-invalid-optional').expect.body;
  for (const field of ['description','language','license','stargazers_count','forks_count']) assert.equal(Object.hasOwn(optional,field),false,field);
  assert.deepEqual(optional.topics,['go','web']);
  assert.deepEqual(byId('detail-filter-language-counts').expect.body.languages,{Go:5,Python:0});
  assert.deepEqual(byId('contents-filter-invalid-entries').expect.body.contents,[{type:'file',name:'main.go'},{type:'dir',name:'src'}]);
  assert.equal(byId('summary-json-utf8-bom').expect.status,200);
});

test('required lookup failures pin rate metadata and fixed errors (R-029)', () => {
  for (const c of contract.cases.filter(c => c.note?.startsWith('R-029:'))) {
    const headers = Object.fromEntries(Object.entries(c.calls[0].response_headers ?? {}).map(([k,v]) => [k.toLowerCase(),v]));
    if (c.expect.status === 429) {
      assert.deepEqual(c.expect.body.rate_limit,{remaining:headers['x-ratelimit-remaining'] ?? null,reset:headers['x-ratelimit-reset'] ?? null},c.id);
      assert.equal(c.expect.retry_after,headers['retry-after'],c.id);
    } else assert.ok([404,502].includes(c.expect.status),c.id);
    assert.ok(!JSON.stringify(c.expect.body).includes('upstream-private-detail'),c.id);
  }
});
