import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { observeBrowser, devtoolsEndpoint } from '../browser-startup.mjs';

async function fixture(handler) {
 const server=http.createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
 return {port:server.address().port,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
function idleBrowser(){const child=new EventEmitter();child.stderr=new PassThrough();child.exitCode=null;child.signalCode=null;return child;}

test('browser exit diagnostic retains only a bounded stderr tail and actual exit code',async()=>{
 const server=await fixture((_,response)=>response.writeHead(503).end());
 const child=spawn(process.execPath,['-e',"process.stderr.write('x'.repeat(20000)+'synthetic-browser-startup-error');process.exitCode=73"],{stdio:['ignore','ignore','pipe'],windowsHide:true});
 const monitor=observeBrowser(child);
 try {await assert.rejects(devtoolsEndpoint({monitor,port:server.port,path:'/json/new?about:blank',method:'PUT',timeout:1000}),error=>{
  assert.match(error.message,/code=73/);assert.match(error.message,/synthetic-browser-startup-error/);assert.ok(error.message.length<5000);return true;
 });}finally{monitor.dispose();if(child.exitCode===null)child.kill();await server.close();}
});

test('spawn failure reports its error instead of timing out without a cause',async()=>{
 const child=spawn('sefgh-browser-does-not-exist-for-test',[],{stdio:['ignore','ignore','pipe'],windowsHide:true});
 const monitor=observeBrowser(child);
 try {await assert.rejects(devtoolsEndpoint({monitor,port:1,path:'/json/version',timeout:500}),/ENOENT/);}finally{monitor.dispose();}
});

test('stalled DevTools response is bounded by the overall startup budget',async()=>{
 const server=await fixture(()=>{});const monitor=observeBrowser(idleBrowser());
 try {const result=await Promise.race([
  devtoolsEndpoint({monitor,port:server.port,path:'/json/new',timeout:120,probeTimeout:40}).then(()=> 'unexpected success',error=>error.message),
  new Promise(resolve=>setTimeout(()=>resolve('unbounded request'),1000)),
 ]);assert.match(result,/DevTools not ready/);}finally{monitor.dispose();await server.close();}
});

test('DevTools success preserves its response and request method',async()=>{
 const server=await fixture((request,response)=>{assert.equal(request.method,'PUT');response.setHeader('Content-Type','application/json');response.end(JSON.stringify({id:'local-fixture',webSocketDebuggerUrl:'ws://127.0.0.1/fixture'}));});
 const monitor=observeBrowser(idleBrowser());
 try {assert.deepEqual(await devtoolsEndpoint({monitor,port:server.port,path:'/json/new?about:blank',method:'PUT'}),{id:'local-fixture',webSocketDebuggerUrl:'ws://127.0.0.1/fixture'});}finally{monitor.dispose();await server.close();}
});

test('oversized DevTools reply retains a fixed diagnostic reason',async()=>{
 const server=await fixture((_,response)=>response.end(JSON.stringify({payload:'x'.repeat(70000)})));const monitor=observeBrowser(idleBrowser());
 try{await assert.rejects(devtoolsEndpoint({monitor,port:server.port,path:'/json/new',timeout:1000,probeTimeout:500}),/REPLY_TOO_LARGE/);}finally{monitor.dispose();await server.close();}
});

test('cold startup readiness has one bounded budget distinct from target commands',async()=>{
 let ready=false;const server=await fixture((request,response)=>{if(!ready){response.writeHead(503).end();return;}assert.equal(request.url,'/json/version');response.end(JSON.stringify({Browser:'Synthetic/1','Protocol-Version':'1.3'}));});
 const monitor=observeBrowser(idleBrowser());
 try{await assert.rejects(devtoolsEndpoint({monitor,port:server.port,path:'/json/version',timeout:40,probeTimeout:20}),/DevTools not ready/);setTimeout(()=>{ready=true;},100);assert.deepEqual(await devtoolsEndpoint({monitor,port:server.port,path:'/json/version',timeout:1000}),{Browser:'Synthetic/1','Protocol-Version':'1.3'});}finally{monitor.dispose();await server.close();}
});
