import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { resolveGitHubAccess, githubFetch, IDENTITY_DEADLINE_MS } = await import('../../src/lib/github/access.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/github-access/cases.json', import.meta.url), 'utf8'));
test('private resource credentials never go to an upstream-supplied external URL',()=>{
  assert.throws(()=>githubFetch('https://other.test/languages','gh-a'),/Untrusted GitHub URL/);
});
for (const c of contract.cases) {
  test(`access: ${c.id}`, async () => {
    let calls = 0;
    const result = await resolveGitHubAccess(new Request('https://app.test/api/github/search', { headers:c.headers }), {
      supabaseURL:'https://auth.test', supabaseKey:'public-key', githubURL:'https://github.test',
      fetch: async (url, init) => {
        const step = c.calls[calls++];
        assert.ok(step, 'unexpected identity request');
        const supabase = step.service==='supabase';
        assert.equal(url, supabase ? 'https://auth.test/auth/v1/user' : 'https://github.test/user');
        assert.equal(init.headers.Authorization, supabase ? c.headers.Authorization : `Bearer ${c.headers['X-GitHub-Token']}`);
        // The public key goes to Supabase and nowhere else.
        assert.equal(init.headers.apikey, supabase ? 'public-key' : undefined);
        if (!supabase) {
          assert.equal(init.headers.Accept, 'application/vnd.github+json');
          assert.equal(init.headers['User-Agent'], 'SEFGH');
        }
        assert.equal(init.cache,'no-store'); assert.equal(init.redirect,'error');
        if (step.network_error) throw new TypeError('fetch failed');
        return Response.json(step.body,{status:step.status});
      },
    });
    assert.equal(result.status,c.status);
    assert.equal(result.token,c.token);
    assert.equal(calls,c.calls.length);
  });
}

// The tests below came from REVIEW-006: each is a change to the check that
// the shared cases alone did not notice.
const linkedUser = { id: 'a', identities: [{ provider: 'github', id: '101' }] };
function issuers(user = linkedUser, account = { id: 101 }) {
  const seen = [];
  const fetch = async (url) => { seen.push(url); return Response.json(url.endsWith('/auth/v1/user') ? user : account); };
  return { seen, options: { supabaseURL: 'https://auth.test', supabaseKey: 'public-key', githubURL: 'https://github.test', fetch } };
}
const signed = (headers) => new Request('https://app.test/api/github/search', { headers });

test('credentials refused on sight make no identity call', async () => {
  const long = 'a'.repeat(8193);
  const twice = (name) => { const h = new Headers({ Authorization: 'Bearer session-a', 'X-GitHub-Token': 'gh-a' }); h.append(name, name === 'Authorization' ? 'Bearer session-b' : 'gh-b'); return h; };
  const refused = {
    'session one character too long': { Authorization: `Bearer ${long}`, 'X-GitHub-Token': 'gh-a' },
    'token one character too long': { Authorization: 'Bearer session-a', 'X-GitHub-Token': long },
    'two Authorization headers': twice('Authorization'),
    'two X-GitHub-Token headers': twice('X-GitHub-Token'),
  };
  for (const [name, headers] of Object.entries(refused)) {
    const { seen, options } = issuers();
    assert.deepEqual(await resolveGitHubAccess(signed(headers), options), { status: 401 }, name);
    assert.equal(seen.length, 0, name);
  }
  const { options } = issuers();
  const atLimit = await resolveGitHubAccess(signed({ Authorization: `Bearer ${'a'.repeat(8192)}`, 'X-GitHub-Token': 'gh-a' }), options);
  assert.deepEqual(atLimit, { status: 200, token: 'gh-a' });
});

test('missing configuration is an outage, not public and not refused', async () => {
  const names = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  try {
    for (const missing of names) {
      for (const n of names) process.env[n] = n === missing ? '' : 'https://auth.test';
      const seen = [];
      const result = await resolveGitHubAccess(signed({ Authorization: 'Bearer session-a', 'X-GitHub-Token': 'gh-a' }), {
        fetch: async (url) => { seen.push(url); return Response.json(linkedUser); },
      });
      assert.deepEqual(result, { status: 503 }, missing);
      assert.equal(seen.length, 0, missing);
    }
  } finally {
    for (const n of names) if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n];
  }
});

test('an identity reply over 1 MiB is an outage', async () => {
  const { seen, options } = issuers({ ...linkedUser, padding: 'x'.repeat(1024 * 1024) });
  assert.deepEqual(await resolveGitHubAccess(signed({ Authorization: 'Bearer session-a', 'X-GitHub-Token': 'gh-a' }), options), { status: 503 });
  assert.equal(seen.length, 1);
  // A complete, valid reply followed by white space is still too large.
  const padded = JSON.stringify(linkedUser) + ' '.repeat(1024 * 1024);
  const result = await resolveGitHubAccess(signed({ Authorization: 'Bearer session-a', 'X-GitHub-Token': 'gh-a' }), {
    supabaseURL: 'https://auth.test', supabaseKey: 'public-key', githubURL: 'https://github.test',
    fetch: async () => new Response(padded),
  });
  assert.deepEqual(result, { status: 503 });
});

test('an issuer that never answers is given up on at the deadline', async () => {
  // backend/internal/githubaccess uses the same four seconds.
  assert.equal(IDENTITY_DEADLINE_MS, 4000);
  const started = Date.now();
  // A deadline timer does not keep Node running by itself. A real request
  // would; this stand-in needs a timer of its own while it waits.
  const keepRunning = setInterval(() => {}, 10);
  try {
    const result = await resolveGitHubAccess(signed({ Authorization: 'Bearer session-a', 'X-GitHub-Token': 'gh-a' }), {
      supabaseURL: 'https://auth.test', supabaseKey: 'public-key', deadlineMs: 30,
      fetch: (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))),
    });
    assert.deepEqual(result, { status: 503 });
    assert.ok(Date.now() - started < 2000, 'waited far longer than the 30 ms deadline');
  } finally {
    clearInterval(keepRunning);
  }
});

test('a GitHub id written another way is still the same number', async () => {
  for (const raw of ['{"id":101.0}', '{"id":1.01e2}', '﻿{"id":101}']) {
    const fetch = async (url) => url.endsWith('/auth/v1/user') ? Response.json(linkedUser) : new Response(raw);
    const result = await resolveGitHubAccess(signed({ Authorization: 'Bearer session-a', 'X-GitHub-Token': 'gh-a' }), {
      supabaseURL: 'https://auth.test', supabaseKey: 'public-key', githubURL: 'https://github.test', fetch,
    });
    assert.deepEqual(result, { status: 200, token: 'gh-a' }, raw);
  }
});
