import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { fetchRepoFromGitHub, fetchRepoForPage } = await import('../../src/lib/repo/repoData.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/public-repository-reads/cases.json', import.meta.url)));

function mockFetch(t, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = fn;
  t.after(() => { globalThis.fetch = original; });
}


for (const c of contract.cases) {
  test(`public repository: ${c.id}`, async (t) => {
    const calls = [];
    t.mock.method(console,'error',()=>{});
    t.mock.method(console,'warn',()=>{});
    t.mock.method(console,'log',()=>{});
    const old = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN='must-never-be-used';
    t.after(()=>{ if(old === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN=old; });
    mockFetch(t,async(url,init)=>{
      calls.push({url,init});
      if(c.network_error) throw new Error('offline');
      return Response.json(c.body ?? null,{status:c.status ?? 200});
    });
    const actual = await fetchRepoFromGitHub(c.owner,c.repo);
    assert.deepEqual(actual,c.expect);
    assert.equal(calls.length,c.calls);
    for(const {url,init} of calls) {
      assert.equal(url,`https://api.github.com/repos/${c.owner}/${c.repo}`);
      assert.equal(new Headers(init.headers).has('authorization'),false);
      assert.equal(init.cache,'no-store');
      assert.equal(init.redirect,'error');
      assert.equal(init.next,undefined);
      assert.ok(init.signal instanceof AbortSignal);
    }
  });
}

// The repository page's mandatory Go read after P7-02
// (REPO-PAGE-001). The stand-in Go answers each case as the Go route does,
// which TestRouteAnswersTheContract in backend/internal/publicrepo checks
// on these same cases: the repository with 200, otherwise 404 null.
const GO = 'https://go.example';
function switchTo(t, url, routes) {
  const old = { url: process.env.SEFGH_GO_API_URL, routes: process.env.SEFGH_GO_ROUTES };
  const put = (name, value) => { if (value === undefined) delete process.env[name]; else process.env[name] = value; };
  put('SEFGH_GO_API_URL', url);
  put('SEFGH_GO_ROUTES', routes);
  t.after(() => { put('SEFGH_GO_API_URL', old.url); put('SEFGH_GO_ROUTES', old.routes); });
}

for (const c of contract.cases) {
  test(`repository page through Go: ${c.id}`, async (t) => {
    switchTo(t, `${GO}/`, '');
    const calls = [];
    mockFetch(t, async (url, init) => {
      calls.push({ url, init });
      return c.expect === null ? Response.json(null, { status: 404 }) : Response.json(c.expect);
    });
    assert.deepEqual(await fetchRepoForPage(c.owner, c.repo), c.expect);
    // GitHub is asked only for a valid name, and so is Go.
    assert.equal(calls.length, Math.min(c.calls, 1));
    for (const { url, init } of calls) {
      assert.equal(url, `${GO}/api/github/public-repo/${c.owner}/${c.repo}`);
      assert.equal(new Headers(init.headers).has('authorization'), false);
      assert.equal(init.cache, 'no-store');
      assert.equal(init.redirect, 'error');
      assert.ok(init.signal instanceof AbortSignal);
    }
  });
}

test('the repository page shows nothing when Go fails or says private', async (t) => {
  switchTo(t, GO, 'github-public-repo');
  let answer;
  mockFetch(t, async () => answer());
  for (answer of [() => { throw new Error('offline'); }, () => new Response('not json'), () => Response.json({ private: true }), () => Response.json({ private: false }, { status: 500 })]) {
    assert.equal(await fetchRepoForPage('octo', 'demo'), null);
  }
});

test('the repository page uses the switched read for the page and its metadata', async () => {
  const page = await readFile(new URL('../../src/app/repo/[owner]/[repo-name]/page.js', import.meta.url), 'utf8');
  assert.equal((page.match(/fetchRepoForPage\(/g) || []).length, 2);
  assert.doesNotMatch(page, /fetchRepoFromGitHub/);
});

// P7-04: the starred handler is retired; Go's starred tests and the
// repo-starred contract cover what its four tests here checked.
