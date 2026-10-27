import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./starred-loader.mjs', import.meta.url);
const { fetchRepoFromGitHub, fetchRepoForPage } = await import('../../src/lib/repo/repoData.js');
const { GET } = await import('../../src/app/api/repo/starred/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/public-repository-reads/cases.json', import.meta.url)));

function mockFetch(t, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = fn;
  t.after(() => { globalThis.fetch = original; });
}

function stubClient(user, rows, error = null) {
  const calls = [];
  const query = {
    select(value) { calls.push(['select',value]); return this; },
    eq(key,value) { calls.push(['eq',key,value]); return this; },
    async order(key,options) { calls.push(['order',key,options]); return {data:rows,error}; },
  };
  globalThis.__starredClient = {
    auth: {getUser:async()=>({data:{user},error:null})},
    from(table) { calls.push(['from',table]); return query; },
  };
  return calls;
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

// The repository page's read with github-public-repo switched on
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
    switchTo(t, `${GO}/`, 'github-search, github-public-repo');
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

test('the repository page reads GitHub itself unless both switches are set', async (t) => {
  switchTo(t, undefined, undefined);
  let calls = [];
  mockFetch(t, async (target) => { calls.push(target); return Response.json({ id: 1, private: false }); });
  for (const [url, routes] of [[undefined, undefined], [undefined, 'github-public-repo'], [GO, 'github-repo'], [GO, '']]) {
    if (url === undefined) delete process.env.SEFGH_GO_API_URL; else process.env.SEFGH_GO_API_URL = url;
    if (routes === undefined) delete process.env.SEFGH_GO_ROUTES; else process.env.SEFGH_GO_ROUTES = routes;
    calls = [];
    assert.deepEqual(await fetchRepoForPage('octo', 'demo'), { id: 1, private: false });
    assert.deepEqual(calls, ['https://api.github.com/repos/octo/demo'], `${url} ${routes}`);
  }
});

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

test('starred denies anonymous callers before database or GitHub access',async(t)=>{
  const calls=stubClient(null,[]);
  mockFetch(t,()=>{throw new Error('unexpected fetch');});
  const response=await GET(new Request('https://app.test/api/repo/starred'));
  assert.equal(response.status,401);
  assert.deepEqual(calls,[]);
});

test('starred revalidates saved metadata, scopes rows and never sends shared credentials',async(t)=>{
  const rows=[
    {id:1,user_id:'alice',repo_full_name:'octo/public',notes:'keep',repo_data:{description:'stale'}},
    {id:2,user_id:'alice',repo_full_name:'octo/hidden',repo_data:{description:'old private text'}},
    {id:3,user_id:'alice',repo_full_name:'octo/../escape',repo_data:{description:'untrusted'}},
    // Three parts is not a repository name, even though the first two are one.
    {id:4,user_id:'alice',repo_full_name:'octo/public/extra',repo_data:{description:'another repository'}},
  ];
  const snapshot=structuredClone(rows);
  const db=stubClient({id:'alice'},rows);
  const calls=[];
  t.mock.method(console,'error',()=>{});
  t.mock.method(console,'log',()=>{});
  mockFetch(t,async(url,init)=>{
    calls.push({url,init});
    return url.endsWith('/public') ? Response.json({private:false,description:'fresh',stargazers_count:3}) : Response.json({message:'Not Found'},{status:404});
  });
  const response=await GET(new Request('https://app.test/api/repo/starred'));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const body=await response.json();
  assert.equal(body.count,4);
  assert.deepEqual(body.repos[0],{...rows[0],repo_data:{description:'fresh',stargazers_count:3}});
  assert.equal(body.repos[1].repo_data,null);
  assert.equal(body.repos[2].repo_data,null);
  assert.equal(body.repos[3].repo_data,null);
  assert.deepEqual(rows,snapshot,'do not mutate or persist stored rows');
  assert.deepEqual(db,[['from','repo_collections'],['select','*'],['eq','user_id','alice'],['order','created_at',{ascending:false}]]);
  assert.equal(calls.length,2);
  for(const {init} of calls) assert.equal(new Headers(init.headers).has('authorization'),false);
});

test('starred preserves database failure without calling GitHub',async(t)=>{
  stubClient({id:'alice'},null,{message:'database unavailable'});
  t.mock.method(console,'error',()=>{});
  mockFetch(t,()=>{throw new Error('unexpected fetch');});
  const response=await GET(new Request('https://app.test/api/repo/starred'));
  assert.equal(response.status,500);
  assert.deepEqual(await response.json(),{error:'Failed to fetch starred repositories'});
});

test('starred limits upstream concurrency and preserves collection ordering',async(t)=>{
  const rows=Array.from({length:9},(_,id)=>({id,repo_full_name:`octo/repo${id}`}));
  stubClient({id:'alice'},rows);
  let active=0, peak=0;
  mockFetch(t,async()=>{
    active++;
    peak=Math.max(peak,active);
    await new Promise(resolve=>setImmediate(resolve));
    active--;
    return Response.json({private:false,description:'public'});
  });
  const response=await GET(new Request('https://app.test/api/repo/starred'));
  assert.equal(response.status,200);
  assert.equal(peak,4);
  assert.deepEqual((await response.json()).repos.map(r=>r.id),rows.map(r=>r.id));
});
