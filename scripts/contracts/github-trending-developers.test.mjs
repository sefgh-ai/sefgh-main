// P7-02: fixture integrity only; Go runs every endpoint case.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const contract = JSON.parse(await readFile(new URL('../../contracts/github-trending-developers/cases.json', import.meta.url), 'utf8'));

test('developer fixture integrity and credential boundaries', () => {
  assert.equal(contract.contract_version,6);
  assert.equal(new Set(contract.cases.map(c=>c.id)).size,contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve','defect'].includes(c.disposition), c.id);
    assert.ok(c.reason,c.id);
    assert.equal((c.go_upstream ?? c.upstream).length,c.expect.calls.length,c.id);
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
test('failed repository lookups are unavailable and keep successful siblings (R-025)', () => {
  for (const c of contract.cases.filter(c => c.reason.startsWith('R-025:'))) {
    assert.equal(c.expect.status, 200, c.id);
    assert.equal(c.expect.body.length, c.upstream[0].body.items.length, c.id);
    assert.equal(c.expect.body[0].popularRepo.name, 'Repository unavailable', c.id);
    assert.ok(!JSON.stringify(c.expect.body).includes('private-upstream-detail'), c.id);
    if (c.expect.body.length > 1) assert.equal(c.expect.body[1].popularRepo.name, 'still-running', c.id);
  }
  const empty = contract.cases.find(c => c.id === 'empty-repositories');
  assert.equal(empty.expect.body[0].popularRepo.name, 'No repositories');
});

test('invalid logins never become repository requests and ranks stay compact (R-027)', () => {
  for (const c of contract.cases.filter(c => c.reason.startsWith('R-027:'))) {
    const users = c.upstream[0].body.items.filter(u => u && typeof u.login === 'string' &&
      u.login.length <= 39 && /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(u.login)).slice(0,20);
    assert.deepEqual(c.expect.body.map(u => u.username),users.map(u => u.login),c.id);
    assert.deepEqual(c.expect.body.map(u => u.rank),users.map((_,i) => i+1),c.id);
    assert.deepEqual(c.expect.calls.slice(1).map(call => new URL(call.url).pathname),users.map(u => '/users/'+u.login+'/repos'),c.id);
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
    }
  }
});

test('delayed enrichment keeps search order and assigns ranks after slicing',()=>{
  const c=contract.cases.find(c=>c.id==='out-of-order-completion');
  assert.deepEqual(c.expect.body.map(d=>[d.username,d.rank]),[['alice',1],['bob',2],['carol',3]]);
  const limit=contract.cases.find(c=>c.id==='twenty-developer-limit');
  assert.equal(limit.expect.body.length,20);
  assert.equal(limit.expect.calls.length,21);
});
