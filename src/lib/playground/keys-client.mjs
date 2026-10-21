// Only fixed, same-origin v1 paths. There is deliberately no legacy fallback.
const selector = /^[A-Za-z0-9_-]{16}$/;
const credential = /^sk_sefgh_v1_([A-Za-z0-9_-]{16})\.[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const fields = ['id','owner_id','name','prefix','scopes','created_at','expires_at','revoked_at'];
const failure = (message, code) => Object.assign(new Error(message), { code });
const exact = (value, names) => value && !Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === names.length && names.every(k => Object.hasOwn(value,k));
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
function metadata(row, owner) {
  if (!exact(row,fields) || typeof row.id !== 'string' || !selector.test(row.id) || row.owner_id !== owner || typeof row.name !== 'string' || !row.name.trim() || [...row.name].length > 200 || row.prefix !== `sk_sefgh_v1_${row.id}.` || !Array.isArray(row.scopes) || row.scopes.length !== 1 || row.scopes[0] !== 'repo:read:public' || !timestamp(row.created_at) || !timestamp(row.expires_at) || Date.parse(row.expires_at) <= Date.parse(row.created_at) || (row.revoked_at !== null && !timestamp(row.revoked_at))) throw failure('Invalid API response.', 'response');
  return { ...row, scopes:[...row.scopes] };
}
const messages = {400:'Check the name or search query.',401:'Sign in again, or check the pasted API key.',403:'This operation is not allowed.',404:'The key service is unavailable.',409:'Your active key limit has been reached.',414:'The encoded search query is too large.',429:'The API quota has been reached. Try later.'};

function abortable(work,signal) {
  return new Promise((resolve,reject) => {
    const aborted=()=>reject(failure('Request cancelled.','cancelled'));
    if(signal.aborted){aborted();return;}
    signal.addEventListener('abort',aborted,{once:true});
    Promise.resolve().then(()=>{if(signal.aborted)throw failure('Request cancelled.','cancelled');return work();})
      .then(resolve,reject).finally(()=>signal.removeEventListener('abort',aborted));
  });
}

export function createKeysClient({ getSession, fetcher = (...args) => fetch(...args) }) {
  async function session(owner,signal) {
    if (signal?.aborted) throw failure('Request cancelled.', 'cancelled');
    let result; try { result=await abortable(getSession,signal); } catch(error) { if(signal.aborted)throw failure('Request cancelled.','cancelled');throw failure('Sign in again to manage keys.', 'session'); }
    const current=result?.data?.session;
    if (result?.error || !owner || current?.user?.id !== owner || current.user.is_anonymous || typeof current.access_token !== 'string' || !current.access_token || current.access_token.length > 8192 || /\s/.test(current.access_token)) throw failure('Sign in again to manage keys.', 'session');
    if (signal?.aborted) throw failure('Request cancelled.', 'cancelled');
    return current.access_token;
  }
  async function request(owner,path,method,body,signal,apiKey,onDispatch=()=>{}) {
    const bounded=AbortSignal.any([AbortSignal.timeout(20000), ...(signal?[signal]:[])]);
    const token=await session(owner,bounded);
    let response;
    try { response=await abortable(()=>{onDispatch();return fetcher(path,{method,body:body===undefined?undefined:JSON.stringify(body),headers:{Authorization:`Bearer ${apiKey || token}`, ...(body===undefined?{}:{'Content-Type':'application/json'})},signal:bounded,cache:'no-store',credentials:'omit',redirect:'error'});},bounded); }
    catch { if(bounded.aborted)throw failure('Request cancelled.', 'cancelled');throw failure('The key service is unavailable.', 'network'); }
    await session(owner,bounded);
    if(!response.ok)throw failure(messages[response.status] || 'The key service is unavailable.',String(response.status));
    if (method==='DELETE') { if(response.status!==204)throw failure('Invalid API response.','response');return; }
    if(response.status!==(method==='POST'?201:200))throw failure('Invalid API response.','response');
    let value;
    try {
      const reader=response.body.getReader(),chunks=[];let size=0;
      // 10,000 rows may contain 200 four-byte Unicode characters or escaped
      // control characters per name. Keep the full contract inside a finite cap.
      try {for(;;){const {value,done}=await abortable(()=>reader.read(),bounded);if(done)break;size+=value.length;if(size>20*1024*1024)throw Error();chunks.push(value);}}
      finally { void reader.cancel().catch(()=>{}); }
      const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
      value=JSON.parse(new TextDecoder().decode(bytes));
    } catch {if(bounded.aborted)throw failure('Request cancelled.','cancelled');throw failure('Invalid API response.','response');}
    await session(owner,bounded);
    return value;
  }
  return {
    async list(owner,signal) {
      const value=await request(owner,'/api/v1/keys','GET',undefined,signal);
      if(!exact(value,['keys']) || !Array.isArray(value.keys) || value.keys.length>10000)throw failure('Invalid API response.','response');
      const rows=value.keys.map(row=>metadata(row,owner));
      if(new Set(rows.map(row=>row.id)).size!==rows.length)throw failure('Invalid API response.','response');
      return rows;
    },
    async issue(owner,name,signal) {
      if(typeof name!=='string'||!name.trim()||[...name.trim()].length>200)throw failure('Enter a key name of up to 200 characters.','input');
      let dispatched=false;
      try {
        const value=await request(owner,'/api/v1/keys','POST',{name:name.trim(),scopes:['repo:read:public']},signal,undefined,()=>{dispatched=true;});
        if(!exact(value,['key','secret'])||typeof value.secret!=='string'||!credential.test(value.secret))throw failure('Invalid API response.','response');
        const key=metadata(value.key,owner);
        if(credential.exec(value.secret)[1]!==key.id)throw failure('Invalid API response.','response');
        return {key,secret:value.secret};
      } catch(error) {
        if(!dispatched || ['400','401','403','409','429'].includes(error.code))throw error;
        throw failure('Creation is not confirmed. Refresh the key list before trying again; revoke an unexpected key. A lost secret cannot be recovered.','ambiguous');
      }
    },
    async revoke(owner,id,signal) {
      if(typeof id!=='string'||!selector.test(id))throw failure('Invalid key.','input');
      return request(owner,'/api/v1/keys/'+id,'DELETE',undefined,signal);
    },
    async search(owner,key,query,signal) {
      if(typeof key!=='string'||!credential.test(key))throw failure('Invalid key. Paste a complete v1 API key.','input');
      if(typeof query!=='string'||!query.trim()||query.length>500)throw failure('Enter a search query of up to 500 characters.','input');
      const encoded=new URLSearchParams({q:query.trim()}).toString();
      if(encoded.length>4096)throw failure('The encoded search query is too large.','input');
      const value=await request(owner,'/api/v1/search?'+encoded,'GET',undefined,signal,key);
      if(!value || !Number.isSafeInteger(value.total_count) || value.total_count<0 || !Array.isArray(value.items))throw failure('Invalid API response.','response');
      return {total:value.total_count,repositories:value.items.slice(0,30).map(row=>row?.full_name).filter(name=>typeof name==='string'&&name.length<=250&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name)&&!name.includes('sk_sefgh_'))};
    },
  };
}
