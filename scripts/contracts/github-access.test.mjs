import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { resolveGitHubAccess, githubFetch } = await import('../../src/lib/github/access.js');
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
        assert.equal(url, step.service==='supabase' ? 'https://auth.test/auth/v1/user' : 'https://github.test/user');
        assert.equal(init.headers.Authorization, step.service==='supabase' ? c.headers.Authorization : `Bearer ${c.headers['X-GitHub-Token']}`);
        assert.equal(init.cache,'no-store'); assert.equal(init.redirect,'error');
        return Response.json(step.body,{status:step.status});
      },
    });
    assert.equal(result.status,c.status);
    assert.equal(result.token,c.token);
    assert.equal(calls,c.calls.length);
  });
}
