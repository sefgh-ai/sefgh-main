// Production Next.js -> compiled Go -> local RPC/GitHub stand-ins.
// Usage: node scripts/keys-routing-probe.mjs <compiled-Go-executable>
// --interrupt-check exercises cooperative SIGTERM cleanup during build startup.
// Credentials used by exercised RPC/provider requests are synthetic.
// Child environments and Next env files are inherited; no browser is used.
import assert from 'node:assert/strict';
import {spawn, spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {writeFileSync, readFileSync} from 'node:fs';
import http from 'node:http';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const executable=process.argv[2];
const receiptPath='docs/verification/keys-routing.json';
const startedAt=new Date().toISOString();
// Invalidate prior evidence before argument checks, builds or server startup.
writeFileSync(receiptPath,JSON.stringify({status:'incomplete',startedAt},null,2)+'\n');
if(!executable)throw new Error('Pass a compiled Go API executable');
const children=[];
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const sourceFiles=['backend/cmd/api/keys.go','backend/cmd/api/main.go','next.config.mjs','scripts/keys-routing-probe.mjs'];
const identity={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='',executableSHA256:sha256(executable),wiringSourceHashes:Object.fromEntries(sourceFiles.map(path=>[path,sha256(path)]))};
let stopping=false,cleanupPromise,stage='initialization',completedReport;
const owner='11111111-1111-4111-8111-111111111111';
const selector=Buffer.alloc(12,1).toString('base64url');
const key=`sk_sefgh_v1_${selector}.${Buffer.alloc(32,2).toString('base64url')}`;
const verifier=createHash('sha256').update(key).digest('hex');
const now=Date.now();
const row={id:selector,owner_id:owner,name:'Example',prefix:`sk_sefgh_v1_${selector}.`,scopes:['repo:read:public'],created_at:new Date(now-60000).toISOString(),expires_at:new Date(now+3600000).toISOString(),revoked_at:null};
let issued=false,failCompletion=false,reservation;
const events=[];
const checks=[];
let violation;
const upstream=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://fixture.invalid');
  res.setHeader('content-type','application/json');
  const json=value=>res.end(JSON.stringify(value));
  if(url.pathname==='/search/repositories'){
   for(const name of ['authorization','apikey','cookie','x-github-token'])if(req.headers[name])throw new Error('Public search received a credential header');
   assert.equal(url.searchParams.get('q'),'c++ & rust');
   events.push('github');return json({total_count:1,items:[{full_name:'fixture/public',private:false,visibility:'public'}]});
  }
  assert.equal(req.headers.apikey,'synthetic-public-key');
  if(req.headers.cookie||req.headers['x-github-token'])throw new Error('RPC received unrelated credentials');
  if(url.pathname==='/auth/v1/user'){
   assert.equal(req.headers.authorization,'Bearer synthetic-owner-session');events.push('auth');
   return json({id:owner,is_anonymous:false});
  }
  const name=url.pathname.replace('/rest/v1/rpc/','');events.push(name);
  const ownerCall=['sefgh_key_issue','sefgh_key_list','sefgh_key_revoke'].includes(name);
  assert.equal(req.headers.authorization,ownerCall?'Bearer synthetic-owner-session':'Bearer synthetic-accountant');
  let body='';for await(const chunk of req)body+=chunk;const args=JSON.parse(body);
  switch(name){
   case 'sefgh_key_policy':return json({revision:'fixture-v1',enabled:true,max_active:4,max_name_runes:40,per_key:5,per_owner:10,lifetime_seconds:3600,window_seconds:60,completion_timeout_seconds:1,charge_mode:'attempt',endpoints:{'public-search':'repo:read:public'}});
   case 'sefgh_key_issue':assert.deepEqual(Object.keys(args).sort(),['p_name','p_scopes']);issued=true;return json({key:row,secret:key});
   case 'sefgh_key_list':return json({items:issued?[row]:[],next:null});
   case 'sefgh_key_lookup':return json({...row,verifier_hex:verifier});
   case 'sefgh_key_reserve':
    assert.equal(args.p_revision,'fixture-v1');assert.equal(args.p_verifier_hex,verifier);
    reservation={RequestID:args.p_request_id,Selector:selector,Owner:owner,Endpoint:'public-search',StartedAt:new Date().toISOString()};return json(reservation);
   case 'sefgh_key_complete':
    assert.equal(args.p_receipt.Reservation.RequestID,reservation.RequestID);
    if(failCompletion){res.statusCode=503;return json({message:'synthetic completion outage'});}return json(null);
   case 'sefgh_key_recovery':assert.equal(args.p_receipt.Reservation.RequestID,reservation.RequestID);return json(null);
   case 'sefgh_key_revoke':row.revoked_at=new Date().toISOString();res.statusCode=204;return res.end();
   default:throw new Error('Unexpected runtime RPC');
  }
 }catch(error){violation=error;res.statusCode=500;res.end('{"error":"synthetic gateway refusal"}');}
});
async function port(){const s=http.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function start(command,args,env,stdio='ignore'){
 if(stopping)throw new Error('Probe interrupted');
 const child=spawn(command,args,{env,stdio,windowsHide:true});
 child.once('error',()=>{child.probeSpawnFailed=true;});
 children.push(child);return child;
}
async function ready(url,child){
 const until=Date.now()+120000;
 while(Date.now()<until){if(stopping)throw new Error('Probe interrupted');if(child.exitCode!==null)throw new Error('Probe server exited before readiness');try{await fetch(url,{signal:AbortSignal.timeout(1000)});return;}catch{await delay(200);}}
 throw new Error('Probe server readiness timed out');
}
const exited=child=>child.probeSpawnFailed||child.exitCode!==null||child.signalCode!==null;
async function awaitExit(child){if(!exited(child))await Promise.race([once(child,'exit'),delay(2000)]);return exited(child);}
function cleanup(){
 return cleanupPromise??=(async()=>{
  let failed=false;
  for(const child of [...children].reverse())if(!exited(child)){
   if(process.platform==='win32'){
    const result=spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});
    const stopped=await awaitExit(child);
    if(!stopped||(result.status!==0&&!exited(child)))failed=true;
   }else{
    child.kill('SIGTERM');if(!await awaitExit(child)){child.kill('SIGKILL');if(!await awaitExit(child))failed=true;}
   }
  }
  if(upstream.listening){upstream.closeAllConnections?.();await new Promise(done=>upstream.close(done));}
  if(failed)throw new Error('Probe child cleanup failed');
 })();
}
async function interrupt(signal){
 if(stopping)return;stopping=true;
 writeFileSync(receiptPath,JSON.stringify({status:'interrupted',startedAt,endedAt:new Date().toISOString(),...identity,stage,childPids:children.map(child=>child.pid).filter(Number.isInteger)},null,2)+'\n');
 try{await cleanup();process.exit(signal==='SIGINT'?130:143);}catch{
  writeFileSync(receiptPath,JSON.stringify({status:'cleanup-failed',startedAt,...identity,stage},null,2)+'\n');process.exit(1);
 }
}
process.on('SIGINT',()=>{void interrupt('SIGINT');});
process.on('SIGTERM',()=>{void interrupt('SIGTERM');});
try{
 stage='local services';
 upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const up=`http://127.0.0.1:${upstream.address().port}`,goPort=await port(),nextPort=await port();
 const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:up,NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-public-key',GITHUB_API_URL:up,GITHUB_TOKEN:'',GITHUB_PUBLIC_READ_TOKEN:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'',SEFGH_KEYS_V1:'1',SEFGH_KEYS_ACCOUNTANT_JWT:'synthetic-accountant',SEFGH_API_ADDR:`127.0.0.1:${goPort}`,SEFGH_GO_API_URL:`http://127.0.0.1:${goPort}`,SEFGH_GO_ROUTES:'playground-keys-v1',NEXT_PUBLIC_SEFGH_KEYS_V1:'1',NEXT_PUBLIC_SEFGH_GO_DATA:'',SEFGH_FORWARDING_PROBE:'1',SEFGH_KEYS_UI_PROBE:'',NEXT_PUBLIC_SITE_URL:`http://127.0.0.1:${nextPort}`,NEXT_TELEMETRY_DISABLED:'1'};
 const go=start(resolve(executable),[],env);await ready(`http://127.0.0.1:${goPort}/api/v1/keys`,go);
 stage='production build';
 const build=start(process.execPath,['node_modules/next/dist/bin/next','build'],env,'inherit');
 if(process.argv.includes('--interrupt-check'))setTimeout(()=>{process.emit('SIGTERM');},300);
 const[code]=await once(build,'exit');assert.equal(code,0,'Isolated production build failed');
 stage='production forwarding';
 const next=start(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(nextPort)],env);
 const base=`http://127.0.0.1:${nextPort}`;await ready(base+'/api/v1/keys',next);
 async function request(method,path,bearer,body){
  const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json','X-GitHub-Token':'synthetic-unrelated-caller-token',Cookie:'synthetic-unrelated-cookie=1'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();assert.equal(response.headers.get('x-sefgh-backend'),'go');assert.match(response.headers.get('cache-control')??'',/no-store/);
  return{status:response.status,text,headers:response.headers};
 }
 const created=await request('POST','/api/v1/keys','synthetic-owner-session',{name:'Example',scopes:['repo:read:public']});assert.equal(created.status,201);assert.equal(JSON.parse(created.text).secret,key);checks.push('owner issuance through production rewrite');
 const listed=await request('GET','/api/v1/keys','synthetic-owner-session');assert.equal(listed.status,200);assert.ok(!listed.text.includes(key));assert.ok(!listed.text.includes(verifier));checks.push('metadata-only list');
 const search=await request('GET','/api/v1/search?q=c%2B%2B%20%26%20rust',key);assert.equal(search.status,200);assert.ok(search.headers.get('x-request-id'));assert.ok(search.text.includes('fixture/public'));assert.ok(events.join(',').includes('sefgh_key_reserve,github,sefgh_key_complete'));checks.push('accounted public search and preserved query');
 failCompletion=true;const withheld=await request('GET','/api/v1/search?q=c%2B%2B%20%26%20rust',key);assert.equal(withheld.status,503);assert.ok(!withheld.text.includes('fixture/public'));assert.ok(events.join(',').includes('sefgh_key_complete,sefgh_key_recovery'));failCompletion=false;checks.push('failed completion withheld and recovery saved');
 const revoked=await request('DELETE','/api/v1/keys/'+selector,'synthetic-owner-session');assert.equal(revoked.status,204);
 const denied=await request('GET','/api/v1/search?q=c%2B%2B%20%26%20rust',key);assert.equal(denied.status,401);assert.equal(events.filter(e=>e==='github').length,2);checks.push('revocation denies provider work');
 if(violation)throw violation;
 if(stopping)throw new Error('Probe interrupted');
 for(const path of sourceFiles)assert.equal(sha256(path),identity.wiringSourceHashes[path],'Wiring source changed during probe');
 completedReport={nextMode:'production',backend:'compiled Go production mux',services:'exercised RPC/provider endpoints are local stand-ins; child environment and Next env files are inherited',checks,providerCalls:2,browserUI:'not exercised',liveDeployment:'not exercised'};
}catch(error){
 if(!stopping)writeFileSync(receiptPath,JSON.stringify({status:'failed',startedAt,endedAt:new Date().toISOString(),...identity,stage},null,2)+'\n');
 throw error;
}finally{
 try{await cleanup();}catch(error){writeFileSync(receiptPath,JSON.stringify({status:'cleanup-failed',startedAt,...identity,stage},null,2)+'\n');throw error;}
}
if(!stopping){const report={status:'passed',startedAt,endedAt:new Date().toISOString(),...identity,...completedReport,cleanup:'all owned children stopped'};writeFileSync(receiptPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
