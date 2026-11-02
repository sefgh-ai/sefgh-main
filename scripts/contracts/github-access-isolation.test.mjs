import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs',import.meta.url);
const { GET } = await import('../../src/app/api/github/repo/route.js');
const fixtures=JSON.parse(await readFile(new URL('../../contracts/github-access/isolation.json',import.meta.url),'utf8'));

test('Next summary isolates users, rechecks revoked access and ignores the server token',async()=>{
  const savedFetch=globalThis.fetch;
  const names=['GITHUB_TOKEN','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
  process.env.GITHUB_TOKEN='owner-private-token-must-never-be-used';
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-key';
  try {
    for(const c of fixtures.cases){
      let resources=0;
      globalThis.fetch=async(url,init)=>{
        if(url==='https://auth.test/auth/v1/user') return Response.json({id:c.user,identities:[{provider:'github',id:c.user==='a'?'101':'102'}]});
        if(url==='https://api.github.com/user') return Response.json({id:c.user==='a'?101:102},{status:c.revoked?401:200});
        resources++;
        assert.equal(init.headers.Authorization,c.user?`Bearer gh-${c.user}`:undefined);
        if(c.user){assert.equal(init.cache,'no-store');assert.equal(init.next,undefined);assert.equal(init.redirect,'error');}
        return Response.json({id:c.resource_id},{status:c.resource_status});
      };
      const res=await GET(new Request('https://app.test/api/github/repo?owner=org&name=private',{
        headers:c.user?{Authorization:`Bearer session-${c.user}`,'X-GitHub-Token':`gh-${c.user}`}:{},
      }));
      assert.equal(res.status,c.status,c.id);
      if(c.user)assert.equal(res.headers.get('cache-control'),'private, no-store',c.id);
      if(c.status===200) assert.equal((await res.json()).id,c.resource_id,c.id);
      assert.equal(resources,c.revoked?0:1,c.id);
    }
  } finally {
    globalThis.fetch=savedFetch;
    for(const n of names)if(saved[n]===undefined)delete process.env[n];else process.env[n]=saved[n];
  }
});

test('all four Next routes reject a provider credential without a session',async()=>{
  for(const route of ['search','repo','repo/[owner]/[repo]','contents/[owner]/[repo]']){
    const {GET}=await import(`../../src/app/api/github/${route}/route.js`);
    const res=await GET(new Request('https://app.test/api/github/x',{headers:{'X-GitHub-Token':'gh-a'}}));
    assert.equal(res.status,401,route);
  }
});
