import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runDevelopersFixture } from './developers-fixture.mjs';
register('./route-loader.mjs', import.meta.url);
const { GET } = await import('../../src/app/api/github/trending-developers/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/github-trending-developers/cases.json', import.meta.url)));

// Version 2 (R-026): Go reads one page of up to 100 repositories and picks
// the most-starred. This Next.js handler keeps asking for one repository with
// sort=stars until it is retired (the owner's rule: fix a backend bug once, in
// Go). Its requests are converted back; where its answer differs too, the case
// carries next_expect, recorded from it.
const asSentByNext = (c) => c.next_expect ?? {
  ...c.expect,
  calls: c.expect.calls.map((call) => ({
    ...call,
    url: call.url.replace('repos?per_page=100', 'repos?sort=stars&per_page=1'),
    wire_url: call.wire_url.replace('repos?per_page=100', 'repos?sort=stars&per_page=1'),
  })),
};

test('developer fixture integrity and credential boundaries', () => {
  assert.equal(contract.contract_version,4);
  assert.equal(new Set(contract.cases.map(c=>c.id)).size,contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve','defect'].includes(c.disposition), c.id);
    assert.ok(c.reason,c.id);
    assert.equal(c.upstream.length,c.expect.calls.length,c.id);
    assert.ok(c.expect.calls.length<=21,c.id);
    for (const call of c.expect.calls) {
      assert.equal(call.headers.authorization,undefined,c.id);
      assert.equal(call.headers['x-github-token'],undefined,c.id);
      assert.equal(call.wire_url,new URL(call.url).href,c.id);
      // R-026: Go never asks GitHub to sort a user's repositories by stars.
      if (call.url.includes('/repos?')) assert.ok(call.url.endsWith('/repos?per_page=100') && !call.url.includes('sort=stars'),c.id);
    }
    if (c.expect.status===400) assert.equal(c.expect.calls.length,0,c.id);
  }
});
test('developer cutoffs are fixed UTC durations (R-022)', () => {
  for (const c of contract.cases) {
    const since = new URL('https://fixture.invalid' + c.request).searchParams.get('since') || 'daily';
    const days = {daily: 1, weekly: 7, monthly: 30}[since];
    for (const call of c.expect.calls.filter((call) => new URL(call.url).pathname === '/search/users')) {
      const cutoff = new URL(call.url).searchParams.get('q').match(/created:>(\S+)/)[1];
      assert.equal(cutoff, new Date(Date.parse(c.now) - days * 86400000).toISOString().replace('.000Z', 'Z'), c.id);
    }
  }
});
test('developer search rate-limit cases pin status and wait metadata (R-023)', () => {
  for (const c of contract.cases) {
    const upstream = c.upstream[0] ?? {};
    const headers = upstream.headers ?? {};
    if (upstream.status === 429 || (upstream.status === 403 && (headers['retry-after'] || headers['x-ratelimit-remaining'] === '0'))) {
      assert.equal(c.expect.status, 429, c.id);
      assert.deepEqual(c.expect.body.rate_limit, {remaining: headers['x-ratelimit-remaining'] ?? null, reset: headers['x-ratelimit-reset'] ?? null}, c.id);
      assert.equal(c.expect.retry_after, headers['retry-after'] ?? null, c.id);
      assert.equal(c.next_expect.status, 500, c.id);
    }
  }
});
for (const c of contract.cases) {
  test(`developers: ${c.id} [${c.disposition}]`,async()=>{
    assert.deepEqual(await runDevelopersFixture(GET,c),asSentByNext(c));
  });
}

test('delayed enrichment keeps search order and assigns ranks after slicing',()=>{
  const c=contract.cases.find(c=>c.id==='out-of-order-completion');
  assert.deepEqual(c.expect.body.map(d=>[d.username,d.rank]),[['alice',1],['bob',2],['carol',3]]);
  const limit=contract.cases.find(c=>c.id==='twenty-developer-limit');
  assert.equal(limit.expect.body.length,20);
  assert.equal(limit.expect.calls.length,21);
});
