import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeysClient } from '../../src/lib/playground/keys-client.mjs';

const owner='owner-a',id='AAAAAAAAAAAAAAAA';
const secret='sk_sefgh_v1_'+id+'.'+'A'.repeat(43);
const metadata={id,owner_id:owner,name:'Local fixture',prefix:'sk_sefgh_v1_'+id+'.',scopes:['repo:read:public'],created_at:'2026-10-21T00:00:00Z',expires_at:'2026-11-21T00:00:00Z',revoked_at:null};
const session=(user=owner)=>({data:{session:{access_token:'fixture-'+user,user:{id:user,is_anonymous:false}}}});
function setup(fetcher,getSession=async()=>session()) {return createKeysClient({getSession,fetcher});}

test('key management binds session and sends only approved creation fields',async()=>{
 let sent;
 const client=setup(async(path,init)=>{sent={path,init};return Response.json({key:metadata,secret},{status:201});});
 const result=await client.issue(owner,'Local fixture');
 assert.equal(result.secret===secret,true);
 assert.equal(sent.path,'/api/v1/keys');assert.equal(sent.init.method,'POST');
 assert.deepEqual(JSON.parse(sent.init.body),{name:'Local fixture',scopes:['repo:read:public']});
 assert.equal(sent.init.headers.Authorization,'Bearer fixture-owner-a');
 for(const [k,v] of Object.entries({cache:'no-store',redirect:'error',credentials:'omit'}))assert.equal(sent.init[k],v);
});
test('missing, anonymous, foreign and failed sessions never dispatch',async()=>{
 for(const value of [{data:{session:null}},session('other'),{data:{session:{access_token:'fixture',user:{id:owner,is_anonymous:true}}}},{error:new Error('private failure')}]) {
  let calls=0;const c=setup(async()=>{calls++;},async()=>value);
  await assert.rejects(c.list(owner),/Sign in/);assert.equal(calls,0);
 }
});
test('account change while response is pending cannot return metadata or secret',async()=>{
 let current=owner,release;const c=setup(()=>new Promise(done=>{release=done;}),async()=>session(current));
 const request=c.issue(owner,'Local fixture');await new Promise(r=>setImmediate(r));current='owner-b';
 release(Response.json({key:metadata,secret},{status:201}));await assert.rejects(request,/not confirmed/);
});
test('list rejects material, foreign owners, duplicates and invalid metadata',async()=>{
 for(const keys of [[{...metadata,secret}],[{...metadata,digest:'private'}],[{...metadata,owner_id:'foreign'}],[metadata,metadata],[{...metadata,expires_at:'invalid'}]]) {
  const c=setup(async()=>Response.json({keys}));await assert.rejects(c.list(owner),/Invalid API response/);
 }
});
test('list accepts metadata only; revoke handles 204 and rejects path injection',async()=>{
 const seen=[];const c=setup(async(path,init)=>{seen.push([path,init.method]);return init.method==='DELETE'?new Response(null,{status:204}):Response.json({keys:[metadata]});});
 assert.deepEqual(await c.list(owner),[metadata]);await c.revoke(owner,id);
 await assert.rejects(c.revoke(owner,'../foreign'),/Invalid key/);
 assert.deepEqual(seen,[['/api/v1/keys','GET'],['/api/v1/keys/'+id,'DELETE']]);
});
test('issue refuses mismatched or noncanonical returned secrets',async()=>{
 for(const value of ['private',secret.replace(id,'BBBBBBBBBBBBBBBB'),secret.slice(0,-1)+'B']) {
  await assert.rejects(setup(async()=>Response.json({key:metadata,secret:value},{status:201})).issue(owner,'Local fixture'),/not confirmed/);
 }
});
test('unavailable create is ambiguous and never retried or sent to legacy routes',async()=>{
 for(const status of [404,503]){let calls=0;const c=setup(async()=>{calls++;return Response.json({error:secret},{status});});
  await assert.rejects(c.issue(owner,'Local fixture'),e=>e.message.includes('not confirmed')&&!e.message.includes(secret));assert.equal(calls,1);
 }
 const c=setup(async()=>Response.json({error:secret},{status:429}));await assert.rejects(c.list(owner),e=>e.message.includes('quota')&&!e.message.includes(secret));
});
test('public test uses pasted credential only at the fixed endpoint; no session fallback',async()=>{
 let sent;const c=setup(async(path,init)=>{sent={path,init};return Response.json({total_count:1,items:[{full_name:'fixture/repo',html_url:'https://github.com/fixture/repo'}]});});
 assert.deepEqual(await c.search(owner,secret,'go & rust'),{total:1,repositories:['fixture/repo']});
 assert.equal(sent.path,'/api/v1/search?q=go+%26+rust');assert.equal(sent.init.headers.Authorization,'Bearer '+secret);
 await assert.rejects(c.search(owner,'legacy-key','go'),/Invalid key/);
});
test('aborted requests fail closed even when transport ignores cancellation',async()=>{
 const controller=new AbortController();const c=setup(async()=>{controller.abort();return Response.json({keys:[metadata]});});
 await assert.rejects(c.list(owner,controller.signal),/cancelled/);
});
test('a failed session check after POST headers or body remains ambiguous',async()=>{
 for(const failureAt of [2,3]){let reads=0,calls=0;const c=setup(async()=>{calls++;return Response.json({key:metadata,secret},{status:201});},async()=>++reads===failureAt?{error:new Error('private')} : session());
  await assert.rejects(c.issue(owner,'Fixture'),e=>e.code==='ambiguous'&&!e.message.includes(secret));assert.equal(calls,1);
 }
});
test('cancellation settles blocked session reads before and after dispatch without late fetch',async()=>{
 for(const afterDispatch of [false,true]){
  let reads=0,calls=0,release;const blocked=new Promise(done=>{release=done;});const controller=new AbortController();
  const c=setup(async()=>{calls++;return Response.json({keys:[]});},()=>++reads===(afterDispatch?2:1)?blocked:Promise.resolve(session()));
  const pending=c.list(owner,controller.signal);await new Promise(r=>setImmediate(r));controller.abort();
  const outcome=await Promise.race([pending.then(()=> 'unexpected',e=>e.message),new Promise(r=>setTimeout(()=>r('still pending'),300))]);assert.match(outcome,/cancelled/);
  release(session());await new Promise(r=>setImmediate(r));assert.equal(calls,afterDispatch?1:0);
 }
});
test('full permitted owner history fits the bounded response allowance',async()=>{
 const keys=Array.from({length:10000},(_,index)=>({...metadata,id:Buffer.from(String(index).padStart(12,'0')).toString('base64url'),name:'界'.repeat(200),prefix:'sk_sefgh_v1_'+Buffer.from(String(index).padStart(12,'0')).toString('base64url')+'.'}));
 assert.equal((await setup(async()=>Response.json({keys})).list(owner)).length,10000);
});
test('numeric selectors and oversized encoded queries are refused',async()=>{
 await assert.rejects(setup(async()=>Response.json({keys:[{...metadata,id:1111111111111111,prefix:'sk_sefgh_v1_1111111111111111.'}]})).list(owner),/Invalid API response/);
 let calls=0;const c=setup(async()=>{calls++;});await assert.rejects(c.search(owner,secret,'界'.repeat(500)),/query/);assert.equal(calls,0);
});
