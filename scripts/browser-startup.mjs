const stderrLimit=4096;
export function observeBrowser(child) {
 let tail=Buffer.alloc(0), errorCode='', closed=false;
 const data=chunk=>{tail=Buffer.from(Buffer.concat([tail,Buffer.from(chunk)]).subarray(-stderrLimit));};
 const error=err=>{errorCode=String(err.code||err.name||'spawn failure').slice(0,80);};
 const close=()=>{closed=true;};
 child.stderr?.on('data',data);child.on('error',error);child.on('close',close);
 return {
  snapshot:()=>({code:child.exitCode,signal:child.signalCode,errorCode,closed,stderr:tail.toString('utf8')}),
  dispose(){child.stderr?.off('data',data);child.off('error',error);child.off('close',close);},
 };
}

export async function devtoolsEndpoint({monitor,port,path,method='GET',timeout=8000,probeTimeout=1000}) {
 const started=Date.now(),end=started+timeout;
 let lastStatus='none',lastError='none';
 function failure(){const state=monitor.snapshot();return new Error(`DevTools not ready: ${path}; elapsed=${Date.now()-started}ms; browser code=${state.code} signal=${state.signal} spawn=${state.errorCode||'none'}; last HTTP=${lastStatus} error=${lastError}; stderr tail (${stderrLimit} bytes max): ${state.stderr}`);}
 while(Date.now()<end){
  const state=monitor.snapshot();if(state.errorCode||state.closed)throw failure();
  const budget=Math.max(1,Math.min(probeTimeout,end-Date.now()));
  try {
   const response=await fetch(`http://127.0.0.1:${port}${path}`,{method,signal:AbortSignal.timeout(budget)});
   lastStatus=response.status;
   if(response.ok){
    const reader=response.body.getReader();let size=0;const chunks=[];
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536)throw Object.assign(new Error('DevTools reply too large'),{code:'REPLY_TOO_LARGE'});chunks.push(value);}}
    finally{await reader.cancel().catch(()=>{});}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
   }
   await response.body?.cancel();
  }catch(error){
   const reason=typeof error.code==='string'?error.code:error.cause?.code||error.name||'request_failure';
   const code=String(reason);lastError=/^[A-Za-z0-9_]+$/.test(code)?code.slice(0,80):'request_failure';
   // An oversized protocol reply cannot become usable by retrying. Preserve
   // this fixed reason instead of replacing it with the final timer abort.
   if(lastError==='REPLY_TOO_LARGE')throw failure();
  }
  await new Promise(resolve=>setTimeout(resolve,Math.min(20,Math.max(0,end-Date.now()))));
 }
 throw failure();
}
