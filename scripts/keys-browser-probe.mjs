// Real protected Next/React page, synthetic SDK sessions, no live DB/provider.
// node scripts/keys-browser-probe.mjs [--off] [--reuse] [--report=PATH]
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { createServerClient } from '@supabase/ssr';
import { observeBrowser, devtoolsEndpoint } from './browser-startup.mjs';
import { prepareKeyProbeZoom } from './key-probe-zoom.mjs';
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const enabled=!process.argv.includes('--off');
async function port(){const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const p=server.address().port;await new Promise(done=>server.close(done));return p;}
const owners=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
let authURL;
const sessions=owners.map((id,index)=>{
 const user={id,aud:'authenticated',role:'authenticated',email:`fixture-${index}@example.invalid`,is_anonymous:false,app_metadata:{provider:'email',providers:['email']},user_metadata:index?{fixture:'chunked-session-'.repeat(400)}:{},created_at:'2026-10-21T00:00:00Z'};
 const access_token=[{alg:'HS256',typ:'JWT'},{sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.'+Buffer.alloc(32,index+1).toString('base64url');
 return {access_token,refresh_token:'synthetic-refresh-'+index,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
});
const auth=http.createServer((request,response)=>{
 const session=sessions.find(s=>request.headers.authorization===`Bearer ${s.access_token}`);
 response.setHeader('Content-Type','application/json');
 if(request.url==='/auth/v1/user' && session)response.end(JSON.stringify(session.user));
 else {response.writeHead(401);response.end('{"message":"Synthetic session denied"}');}
});
const reuse=process.argv.includes('--reuse');
const manifestPath='.next-key-ui-probe/synthetic-auth.json';
const manifest=reuse?JSON.parse(readFileSync(manifestPath,'utf8')):null;
if(reuse)assert.equal(manifest.enabled,enabled,'probe build flag must match');
auth.listen(manifest?.authPort||0,'127.0.0.1');await once(auth,'listening');authURL=`http://127.0.0.1:${auth.address().port}`;
const cookies=[];
for(const session of sessions){
 const jar=new Map();const sdk=createServerClient(authURL,'synthetic-public-key',{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:changes=>changes.forEach(c=>jar.set(c.name,c.value))}});
 const {error}=await sdk.auth.setSession(session);assert.equal(error,null,'synthetic SDK cookie generation');cookies.push([...jar].map(([name,value])=>({name,value})));
}
const base=`http://127.0.0.1:${await port()}`,debugPort=await port();
const env={...process.env,SEFGH_KEYS_UI_PROBE:'1',SEFGH_FORWARDING_PROBE:'',NEXT_PUBLIC_SEFGH_KEYS_V1:enabled?'1':'0',NEXT_PUBLIC_SUPABASE_URL:authURL,NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-public-key',SEFGH_GO_API_URL:'',SEFGH_GO_ROUTES:'',NEXT_PUBLIC_SEFGH_GO_DATA:'',GITHUB_TOKEN:'',GITHUB_PUBLIC_READ_TOKEN:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'',NEXT_TELEMETRY_DISABLED:'1'};
let next,browser,monitor,profile;
const results=[];
function installFixture(config){
 localStorage.removeItem('sefgh-cookie-consent');
 const original=window.fetch.bind(window),state=window.__keysProbe={calls:[],unexpected:[],rows:[],pending:[],pendingLists:[],copyPending:[],slowCopy:false,slowCreate:false,slowSearch:false,slowList:false,createStatus:201,listStatus:200,revokeStatus:204,copyFails:true,clipboard:'',creates:0,expectedKey:'sk_sefgh_v1_'+'B'.repeat(16)+'.'+'A'.repeat(43)};
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(state.copyFails)throw Error('Synthetic clipboard denial');if(state.slowCopy)return new Promise(done=>state.copyPending.push(()=>{state.clipboard=value;done();}));state.clipboard=value;}}});
 const id=index=>String.fromCharCode(65+index).repeat(16);
 const make=owner=>{const keyId=id(state.creates);return {id:keyId,owner_id:owner,name:'Fixture key',prefix:`sk_sefgh_v1_${keyId}.`,scopes:['repo:read:public'],created_at:'2026-10-21T00:00:00Z',expires_at:'2099-10-21T00:00:00Z',revoked_at:null};};
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href),method=init.method||'GET';
  const headers=new Headers(init.headers||input.headers),bearer=headers.get('Authorization');
  const session=config.sessions.find(s=>bearer===`Bearer ${s.access_token}`);
  if(url.pathname.startsWith('/api/v1/')){
   state.calls.push({path:url.pathname,method,owner:session?.user.id||'api-key',pasted:bearer===`Bearer ${state.expectedKey}`});
   if(url.pathname==='/api/v1/keys'&&method==='GET'){const answer=()=>Response.json(state.listStatus===200?{keys:state.rows.filter(row=>row.owner_id===session?.user.id)}:{error:'Synthetic outage'},{status:state.listStatus});if(state.slowList)return new Promise(done=>state.pendingLists.push(()=>done(answer())));return answer();}
   if(url.pathname==='/api/v1/keys'&&method==='POST'){
    state.creates++;const row=make(session?.user.id);row.name=JSON.parse(init.body).name;state.rows.push(row);
    const answer=()=>Response.json({key:row,secret:row.prefix+'A'.repeat(43)},{status:state.createStatus});
    if(state.slowCreate)return new Promise(done=>state.pending.push(()=>done(answer())));return answer();
   }
   if(url.pathname.startsWith('/api/v1/keys/')&&method==='DELETE'){if(state.revokeStatus!==204)return Response.json({error:'Synthetic outage'},{status:state.revokeStatus});const row=state.rows.find(row=>row.id===url.pathname.split('/').at(-1)&&row.owner_id===session?.user.id);if(row)row.revoked_at='2026-10-21T01:00:00Z';return new Response(null,{status:204});}
   if(url.pathname==='/api/v1/search') {const answer=()=>Response.json({total_count:1,items:[{full_name:'fixture/public-repo'}]});if(state.slowSearch)return new Promise(done=>state.pending.push(()=>done(answer())));return answer();}
  }
  if(url.origin===config.authURL){
   if(url.pathname==='/auth/v1/user')return session?Response.json(session.user):Response.json({message:'Synthetic denial'},{status:401});
   if(['/rest/v1/notifications','/rest/v1/profiles'].includes(url.pathname))return Response.json([]);
   if(!config.enabled&&['/rest/v1/api_keys','/rest/v1/api_logs','/rest/v1/api_limits'].includes(url.pathname)){state.calls.push({path:url.pathname,method});return Response.json([]);}
   state.unexpected.push(url.pathname);throw Error('Unexpected synthetic data request');
  }
  if(url.origin===location.origin&&(!url.pathname.startsWith('/api/')||url.pathname.startsWith('/api/auth/')))return original(input,init);
  state.unexpected.push(url.pathname);throw Error('Unexpected browser request');
 };
}
async function browserSession(view){
 const target=await devtoolsEndpoint({monitor,port:debugPort,path:'/json/new?about:blank',method:'PUT'});
 const ws=new WebSocket(target.webSocketDebuggerUrl);await Promise.race([once(ws,'open'),sleep(5000).then(()=>{throw Error('CDP connection timeout');})]);
 let id=0;const pending=new Map(),exceptions=[];
 const rejectAll=()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('CDP closed'));}pending.clear();};
 ws.addEventListener('close',rejectAll);
 ws.onmessage=({data})=>{const message=JSON.parse(data);if(message.id&&pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);clearTimeout(p.timer);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails?.text);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout: '+method));},8000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(String(result.exceptionDetails.exception?.description||result.exceptionDetails.text).slice(0,1000));return result.result.value;};
 const wait=async expression=>{const end=Date.now()+12000;while(Date.now()<end){if(await evaluate(`Boolean(document.body && (${expression}))`))return;await sleep(80);}throw Error('UI wait failed: '+expression);};
 const clickExpression=async expression=>{await wait(`!!(${expression}) && !(${expression}).disabled && (${expression}).getBoundingClientRect().height>0`);await evaluate(`(${expression}).click()`);};
 const click=label=>clickExpression(`[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(label)})`);
 const clickSelector=selector=>clickExpression(`document.querySelector(${JSON.stringify(selector)})`);
 const input=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.focus();e.select();})()`);await send('Input.insertText',{text:value});};
 const key=async(key,code=key,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers,windowsVirtualKeyCode:key==='Enter'?13:key==='Escape'?27:9,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers,windowsVirtualKeyCode:key==='Enter'?13:key==='Escape'?27:9});};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Network.setBlockedURLs',{urls:['https://*','wss://*',`ws://127.0.0.1:${new URL(authURL).port}/*`]});
 await send('Emulation.setDeviceMetricsOverride',{width:view.width,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(${installFixture.toString()})(${JSON.stringify({authURL,sessions,enabled})})`});
 const setOwner=async index=>{const stored=await send('Network.getCookies',{urls:[base]});for(const cookie of stored.cookies.filter(c=>/^sb-.*-auth-token(?:\.\d+)?$/.test(c.name)))await send('Network.deleteCookies',{name:cookie.name,domain:cookie.domain,path:cookie.path});await send('Network.setCookies',{cookies:cookies[index].map(c=>({...c,url:base,path:'/'}))});};
 await setOwner(0);
 await send('Page.navigate',{url:base+'/playground'});
 if(view.name==='zoom200')await prepareKeyProbeZoom(evaluate,base+'/playground');
 return {send,evaluate,wait,click,clickSelector,input,key,setOwner,exceptions,close:async()=>{rejectAll();ws.close();await fetch(`http://127.0.0.1:${debugPort}/json/close/${target.id}`).catch(()=>{});}};
}
try {
 if(!reuse){
  const build=spawn(process.execPath,['node_modules/next/dist/bin/next','build'],{env,stdio:'inherit',windowsHide:true});const [code]=await once(build,'exit');assert.equal(code,0,'key UI production build');
  writeFileSync(manifestPath,JSON.stringify({authPort:auth.address().port,enabled}));
 }
 next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',new URL(base).port],{env,stdio:'ignore',windowsHide:true});
 let ready=false;for(let i=0;i<100;i++){if(next.exitCode!==null)throw Error('Next exited');try{const r=await fetch(base+'/api-reference',{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await sleep(100);}assert.ok(ready,'Next readiness');
 const noCookie=await fetch(base+'/playground',{redirect:'manual'});assert.equal(noCookie.status,307,'protected page still requires a session');
 const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);assert.ok(chrome,'Chrome required');
 profile=mkdtempSync(join(tmpdir(),'sefgh-keys-browser-'));
 browser=spawn(chrome,['--headless=new',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-gpu','about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});monitor=observeBrowser(browser);
 await devtoolsEndpoint({monitor,port:debugPort,path:'/json/version',timeout:45000});
 for(const view of enabled?[{name:'desktop',width:1280},{name:'phone',width:390},{name:'zoom200',width:640}]:[{name:'default-off',width:1280}]){
  const s=await browserSession(view);
  try {
   if(!enabled){await s.wait(`document.body.textContent.includes('API Playground')&&!!document.querySelector('[role="tablist"]')`);assert.equal(await s.evaluate(`!!document.querySelector('[data-key-mode="v1"]')`),false);assert.equal(await s.evaluate(`window.__keysProbe.calls.some(c=>c.path.startsWith('/api/v1/'))`),false);results.push({view:view.name,checks:['legacy retained','no v1 request']});continue;}
   await s.wait(`document.body.textContent.includes('No keys yet.')`);
   if(view.name==='zoom200')assert.equal(await s.evaluate(`Number(getComputedStyle(document.documentElement).zoom)`),2,'destination page remains at 200% zoom');
   await s.wait(`!!document.querySelector('[aria-label="Cookie choices"]')`);
   assert.equal(await s.evaluate(`(()=>{const r=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Got it').getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&e?.closest('button')?.textContent.trim()==='Got it';})()`),true,'cookie choice reachable above navigation');
   await s.click('Got it');
   await s.input('#v1-key-name','Fixture key');await s.wait(`[...document.querySelectorAll('button')].some(e=>e.textContent==='Create key'&&!e.disabled)`);await s.key('Enter');await s.key('Enter');
   await s.wait(`!!document.querySelector('[aria-label="New API key"]')`);
   assert.equal(await s.evaluate(`(()=>{const r=document.querySelector('[role="dialog"]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})()`),true,'reveal dialog within viewport');
   const revealReport=process.argv.find(arg=>arg.startsWith('--report='))?.slice(9);if(revealReport){const shot=await s.send('Page.captureScreenshot',{format:'png'});writeFileSync(revealReport+'.reveal.'+view.name+'.png',Buffer.from(shot.data,'base64'));}
   assert.equal(await s.evaluate('window.__keysProbe.creates'),1,'double-submit');
   assert.equal(await s.evaluate(`document.querySelector('[role="dialog"]').contains(document.activeElement)`),true,'dialog focus');
   await s.key('Tab');await s.key('Tab','Tab',8);assert.equal(await s.evaluate(`document.querySelector('[role="dialog"]').contains(document.activeElement)`),true,'keyboard focus remains in dialog');
   await s.click('Copy key');await s.wait(`document.body.textContent.includes('Copy failed.')`);
   await s.evaluate('window.__keysProbe.copyFails=false');await s.click('Copy key');await s.wait(`document.body.textContent.includes('Copied.')`);
   assert.equal(await s.evaluate(`window.__keysProbe.clipboard.startsWith('sk_sefgh_v1_')`),true);
   await s.evaluate('window.__keysProbe.slowCopy=true');await s.click('Copy key');await s.wait('window.__keysProbe.copyPending.length===1');
   await s.key('Escape');await s.wait(`!document.querySelector('[aria-label="New API key"]')`);await s.evaluate('window.__keysProbe.copyPending.shift()()');await sleep(100);assert.equal(await s.evaluate(`document.body.textContent.includes('Copied.')`),false,'late copy success cleared');
   await s.wait(`document.activeElement.id==='v1-key-name'`);
   await s.click('Refresh key list');await sleep(120);assert.equal(await s.evaluate(`document.body.textContent.includes('A'.repeat(43))`),false,'secret not listed');
   await s.evaluate('window.__keysProbe.listStatus=404');await s.click('Refresh key list');await s.wait(`document.body.textContent.includes('The key service is unavailable.')`);
   await s.evaluate('window.__keysProbe.listStatus=200;window.__keysProbe.slowList=true');await s.click('Refresh key list');await s.wait('window.__keysProbe.pendingLists.length===1');
   assert.equal(await s.evaluate(`document.querySelector('button[aria-label="Revoke Fixture key"]').disabled`),true,'refresh locks revoke');
   await s.evaluate(`window.__keysProbe.revokeStatus=503;setTimeout(()=>{window.__keysProbe.slowList=false;window.__keysProbe.pendingLists.shift()();},150)`);
   await s.clickSelector('button[aria-label="Revoke Fixture key"]');await s.click('Confirm revocation');await s.wait(`!!document.querySelector('[role="dialog"] [role="status"]') && document.querySelector('[role="dialog"] [role="status"]').textContent.includes('unavailable')`);
   await s.click('Cancel');await s.wait(`document.activeElement.getAttribute('aria-label')==='Revoke Fixture key'`);
   await s.evaluate(`window.__keysProbe.revokeStatus=204`);await s.clickSelector('button[aria-label="Revoke Fixture key"]');await s.click('Confirm revocation');await s.wait(`document.body.textContent.includes('Key revoked.')`);await s.wait(`document.activeElement.textContent==='Refresh key list'`);
   assert.equal(await s.evaluate(`document.querySelector('button[aria-label="Revoke Fixture key"]').disabled`),true);
   await s.click('Test public search');await s.input('#v1-test-key','sk_sefgh_v1_'+ 'B'.repeat(16)+'.'+'A'.repeat(43));await s.input('#v1-test-query','Go server');await s.click('Run public search');await s.wait(`document.body.textContent.includes('fixture/public-repo')`);
   assert.equal(await s.evaluate(`window.__keysProbe.calls.find(c=>c.path==='/api/v1/search').pasted`),true);
   await s.evaluate('window.__keysProbe.slowSearch=true');await s.click('Run public search');await s.wait('window.__keysProbe.pending.length===1');await s.input('#v1-test-query','Changed query');await s.evaluate('window.__keysProbe.pending.shift()()');await sleep(120);assert.equal(await s.evaluate(`document.body.textContent.includes('fixture/public-repo')`),false,'edited query invalidates pending result');await s.evaluate('window.__keysProbe.slowSearch=false');
   await s.click('API keys');await s.click('Test public search');assert.equal(await s.evaluate(`document.querySelector('#v1-test-key').value`),'','tab clears pasted key');await s.click('API keys');await s.wait(`!!document.querySelector('button[aria-label="Revoke Fixture key"]')`);
   await s.evaluate('window.__keysProbe.slowCreate=true');await s.input('#v1-key-name','A pending key');await s.key('Enter');await s.wait('window.__keysProbe.pending.length===1');
   await s.setOwner(1);await s.evaluate(`new BroadcastChannel('sb-127-auth-token').postMessage({event:'SIGNED_IN',session:${JSON.stringify(sessions[1])}})`);
   await s.wait(`document.body.textContent.includes('No keys yet.')`);await s.evaluate('window.__keysProbe.pending.shift()()');await sleep(150);
   assert.equal(await s.evaluate(`!!document.querySelector('[aria-label="New API key"]')||document.body.textContent.includes('A pending key')`),false,'old owner response');
   await s.evaluate('window.__keysProbe.slowCreate=false;window.__keysProbe.createStatus=503');await s.input('#v1-key-name','Ambiguous key');await s.key('Enter');await s.wait(`document.body.textContent.includes('Creation is not confirmed.')`);
   const count=await s.evaluate('window.__keysProbe.creates');await s.key('Enter');assert.equal(await s.evaluate('window.__keysProbe.creates'),count,'no retry');
   await s.click('Refresh key list');await s.wait(`!!document.querySelector('button[aria-label="Revoke Ambiguous key"]')`);
   await s.evaluate('window.__keysProbe.slowCreate=true;window.__keysProbe.createStatus=201');await s.input('#v1-key-name','Unmount pending');await s.key('Enter');await s.wait('window.__keysProbe.pending.length===1');
   await s.click('API reference');await s.wait(`location.pathname==='/api-reference'`);await s.evaluate('window.__keysProbe.pending.shift()()');await sleep(120);assert.equal(await s.evaluate(`!!document.querySelector('[aria-label="New API key"]')`),false);
   await s.evaluate(`[...document.querySelectorAll('a')].find(e=>e.textContent==='Back to playground').click()`);await s.wait(`document.body.textContent.includes('Unmount pending')`);assert.equal(await s.evaluate(`!!document.querySelector('[aria-label="New API key"]')`),false);
   assert.equal(await s.evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false,'horizontal overflow');
   assert.deepEqual(await s.evaluate('window.__keysProbe.unexpected'),[],'unapproved API/data access');assert.deepEqual(s.exceptions,[],'uncaught browser exceptions');
   const report=process.argv.find(arg=>arg.startsWith('--report='))?.slice(9);if(report){const screenshot=await s.send('Page.captureScreenshot',{format:'png'});writeFileSync(report+'.'+view.name+'.png',Buffer.from(screenshot.data,'base64'));}
   results.push({view:view.name,checks:['protected entry','single create','dialog focus/Escape','honest clipboard','metadata-only refresh','confirmed revoke','pasted credential','tab clear','pending account isolation','ambiguous no-retry','client navigation cleanup','bounds and no unexpected calls']});
   console.log(`${view.name}: key UI browser checks passed`);
  } catch(error) {
   console.error('Synthetic browser failure state:',await s.evaluate(`JSON.stringify({path:location.pathname,text:document.body?.innerText.slice(0,2200),calls:window.__keysProbe?.calls,unexpected:window.__keysProbe?.unexpected})`).catch(()=> 'unavailable'));
   console.error('Synthetic uncaught exceptions:',s.exceptions);
   throw error;
  } finally {await s.close();}
 }
 const report=process.argv.find(arg=>arg.startsWith('--report='))?.slice(9);if(report)writeFileSync(report,JSON.stringify(results,null,2)+'\n');
} finally {
 for(const child of [next,browser])if(child?.pid&&child.exitCode===null&&child.signalCode===null){const stopped=once(child,'exit');child.kill();await Promise.race([stopped,sleep(3000)]);}
 monitor?.dispose();auth.closeAllConnections();await new Promise(done=>auth.close(done));
 if(profile&&resolve(profile).startsWith(resolve(tmpdir())+sep)&&resolve(profile).split(sep).at(-1).startsWith('sefgh-keys-browser-')){try{rmSync(profile,{recursive:true,force:true});}catch{}}
}
