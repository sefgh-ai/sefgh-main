// P7-02: fixture integrity only; Go runs every endpoint case.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const contract = JSON.parse(await readFile(new URL('../../contracts/github-trending/cases.json', import.meta.url), 'utf8'));

test('trending fixture integrity', () => {
  assert.equal(contract.contract_version,8);
  for (const c of contract.cases) {
    for (const call of c.expect.calls) {
      const terms = decodeURIComponent(new URL(call.url).search.match(/q=([^&]*)/)[1]).split(' ');
      assert.ok(terms.length >= 2 && !terms.some((t) => t.includes('+created')), `${c.id}: GitHub reads search terms separated by spaces`);
      assert.ok(terms.some((t) => /^created:>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(t)), `${c.id}: the search starts at a UTC time, not a date (R-203)`);
    }
  }
  assert.equal(new Set(contract.cases.map(c=>c.id)).size,contract.cases.length);
  for(const c of contract.cases) {
    assert.ok(['preserve','defect'].includes(c.disposition),c.id);
    assert.ok(c.reason,c.id);
    // Version 2 (R-020): nothing is random any more.
    assert.equal(c.random,undefined,c.id);
    assert.equal(c.expect.random_calls,0,c.id);
    for (const item of Array.isArray(c.expect.body) ? c.expect.body : []) {
      assert.ok(!("starsToday" in item),c.id);
      assert.ok(item.starsPerDay === null || Number.isInteger(item.starsPerDay),c.id);
      assert.ok([1,2,3].includes(item.heatLevel),c.id);
    }
    if(c.expect.status === 400) assert.equal(c.expect.calls.length,0,c.id);
  }
});
test('colours use only the real table and C++ survives query decoding (R-024)', () => {
  for (const id of ['prototype-color', 'inherited-color-names']) {
    const c = contract.cases.find(c => c.id === id);
    assert.ok(c.expect.body.length > 0);
    for (const item of c.expect.body) assert.equal(item.languageColor, '#8b949e', item.language);
  }
  const cpp = contract.cases.find(c => c.id === 'cpp-language');
  const query = new URL(cpp.expect.calls[0].url).searchParams.get('q');
  assert.ok(query.endsWith(' language:C++'));
  assert.ok(!query.includes('+created:'));
});

test('trending cutoffs are fixed UTC durations (R-022)', () => {
  for (const c of contract.cases) {
    const since = new URL('https://fixture.invalid' + c.request).searchParams.get('since') || 'daily';
    const days = {daily: 1, weekly: 7, monthly: 30}[since];
    for (const call of c.expect.calls) {
      const cutoff = new URL(call.url).searchParams.get('q').match(/created:>(\S+)/)[1];
      assert.equal(cutoff, new Date(Date.parse(c.now) - days * 86400000).toISOString().replace('.000Z', 'Z'), c.id);
    }
  }
});
test('trending rate-limit cases pin status and wait metadata (R-023)', () => {
  for (const c of contract.cases) {
    const headers = c.upstream.headers ?? {};
    if (c.upstream.status === 429 || (c.upstream.status === 403 && (headers['retry-after'] || headers['x-ratelimit-remaining'] === '0'))) {
      assert.equal(c.expect.status, 429, c.id);
      assert.deepEqual(c.expect.body.rate_limit, {remaining: headers['x-ratelimit-remaining'] ?? null, reset: headers['x-ratelimit-reset'] ?? null}, c.id);
      assert.equal(c.expect.retry_after, headers['retry-after'] ?? null, c.id);
    }
  }
});
