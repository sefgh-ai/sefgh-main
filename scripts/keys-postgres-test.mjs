// Native PostgreSQL tests confined to an explicitly labelled Docker fixture.
// No URL, password, linked project or Supabase connector is accepted.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';

const container = process.argv[2];
if (!container || !/^[A-Za-z0-9_.-]+$/.test(container)) throw new Error('Pass an owned test-container name/id');
const inspect = spawnSync('docker', ['inspect', '--format', '{{json .Config.Labels}}', container], { encoding: 'utf8' });
if (inspect.status !== 0 || JSON.parse(inspect.stdout)?.['com.sefgh.test'] !== 'keys') throw new Error('Refusing an unlabelled database');
const args = ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'];
function sql(source, expected = true) {
  const r = spawnSync('docker', args, { input: source, encoding: 'utf8', timeout: 15000, maxBuffer: 4 << 20 });
  if (expected && r.status !== 0) throw new Error(`Native SQL failed: ${r.stderr}`);
  return { ok: r.status === 0, text: r.stdout.trim(), error: r.stderr };
}
function asyncSQL(source) {
  return new Promise((resolve, reject) => {
    const p = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let text = '', error = '';
    p.stdout.on('data', c => { text += c; }); p.stderr.on('data', c => { error += c; });
    const timer = setTimeout(() => { p.kill(); reject(new Error('Native SQL child timed out')); }, 15000);
    p.on('error', e => { clearTimeout(timer); reject(e); });
    p.on('close', code => { clearTimeout(timer); resolve({ ok: code === 0, text: text.trim(), error }); });
    p.stdin.end(source);
  });
}
const quote = s => `'${String(s).replaceAll("'", "''")}'`;
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222', c = '33333333-3333-4333-8333-333333333333';
const asUser = (owner, body) => `begin; set local role authenticated; set local "request.jwt.claims"=${quote(JSON.stringify({ role: 'authenticated', sub: owner, is_anonymous: false }))}; ${body}; commit;`;
const asAccountant = body => `begin; set local role sefgh_key_accountant; ${body}; commit;`;
const issue = owner => JSON.parse(sql(asUser(owner, `select public.sefgh_key_issue(' Test ',array['repo:read:public'])`)).text);
const reserve = (key, id, revision = 'fixture-v1') => asAccountant(`select public.sefgh_key_reserve(${quote(key.key.id)},${quote(createHash('sha256').update(key.secret).digest('hex'))},${quote(id)},'public-search',${quote(revision)})`);
let assertions = 0;
function check(condition, message) { assertions++; if (!condition) throw new Error(message); }

sql(await readFile(new URL('../supabase/tests/keys_001_bootstrap.sql', import.meta.url), 'utf8'));
const legacyBefore = sql('select md5(row_to_json(k)::text) from public.api_keys k').text;
const proposal = await readFile(new URL('../supabase/migrations/20261021063751_keys_001_hashed_lifecycle.sql', import.meta.url), 'utf8');
sql(`create function public.sefgh_key_issue(text) returns text language sql as $$select $1$$`);
const overloadACL=sql(`select proacl::text from pg_proc where oid='public.sefgh_key_issue(text)'::regprocedure`).text;
check(!sql(proposal,false).ok,'Migration accepted preexisting name overload');
check(sql(`select proacl::text from pg_proc where oid='public.sefgh_key_issue(text)'::regprocedure`).text===overloadACL,'Collision changed unrelated overload grants');
sql('drop function public.sefgh_key_issue(text)');
const failureBeforeCommit = proposal.replace(/\ncommit;\s*$/, '\nselect 1/0;\ncommit;\n');
check(failureBeforeCommit !== proposal && !sql(failureBeforeCommit,false).ok,'Injected pre-commit migration failure succeeded');
check(sql(`select count(*) from pg_namespace where nspname='sefgh_keys'`).text==='0','Failed apply retained private schema');
check(sql(`select count(*) from pg_roles where rolname='sefgh_key_accountant'`).text==='0','Failed apply retained role');
check(sql(`select count(*) from pg_proc where proname like 'sefgh_key_%'`).text==='0','Failed apply retained wrappers');
check(sql('select md5(row_to_json(k)::text) from public.api_keys k').text===legacyBefore,'Failed apply changed legacy row');
sql(proposal);
check(!sql(proposal,false).ok,'Repeated migration silently replaced existing objects');
check(sql(`select count(*) from information_schema.tables where table_schema='sefgh_keys'`).text === '6', 'Private schema not created');
check(!sql(asUser(a, `select public.sefgh_key_issue('Test',array['repo:read:public'])`), false).ok, 'Missing policy admitted issuance');
sql(`insert into sefgh_keys.policy values(true,'fixture-v1',true,4,40,3,4,3600,86400,1)`);

for (const role of ['anon', 'authenticated', 'service_role', 'sefgh_key_accountant']) {
  for (const table of ['policy', 'keys', 'events', 'owner_windows', 'key_windows', 'recovery']) {
    check(!sql(`set role ${role}; select * from sefgh_keys.${table}`, false).ok, `${role} read private table ${table}`);
  }
}
for (const role of ['anon', 'service_role', 'sefgh_key_accountant']) {
  check(!sql(`set role ${role}; select public.sefgh_key_issue('Test',array['repo:read:public'])`, false).ok, `${role} reached management wrapper`);
  check(!sql(`set role ${role}; select sefgh_keys.issue_owned('Test',array['repo:read:public'])`, false).ok, `${role} reached management helper`);
}
for (const role of ['anon', 'authenticated', 'service_role']) {
  check(!sql(`set role ${role}; select public.sefgh_key_policy()`, false).ok, `${role} reached accounting wrapper`);
  check(!sql(`set role ${role}; select sefgh_keys.get_policy()`, false).ok, `${role} reached accounting helper`);
}
check(!sql('set role authenticated; select public.sefgh_key_list(null,null)', false).ok, 'Missing owner accepted');
check(!sql(`begin; set local role authenticated; set local "request.jwt.claims"='{"role":"authenticated","sub":"${a}","is_anonymous":true}'; select sefgh_keys.list_owned(null,null)`, false).ok, 'Anonymous sign-in accepted');
for (const role of ['authenticated', 'service_role', 'pg_read_all_data']) {
  check(sql(`select pg_has_role('sefgh_key_accountant','${role}','MEMBER')`).text === 'f', 'Accountant inherited unrelated role');
}
check(!sql('set session authorization sefgh_key_accountant; set role authenticated', false).ok, 'Accountant assumed user role');
check(!sql('set role sefgh_key_accountant; select * from public.api_keys', false).ok, 'Accountant read legacy user data');
check(!sql('set role sefgh_key_accountant; select public.fixture_mutator()', false).ok, 'Accountant reached unrelated mutator');
check(sql(`select count(*) from pg_class where relowner='sefgh_key_accountant'::regrole`).text === '0', 'Accountant owns database objects');
check(sql(`select bool_and(not has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) from unnest(array['anon','authenticated','service_role','sefgh_key_accountant']) r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='sefgh_keys' and c.relkind='r'`).text === 't', 'Private table privilege leaked');
for (const role of ['anon','authenticated','service_role','sefgh_key_accountant']) {
  const want = role === 'authenticated' ? 3 : role === 'sefgh_key_accountant' ? 6 : 0;
  check(sql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'sefgh_key_%' and has_function_privilege('${role}',p.oid,'EXECUTE')`).text === String(want), `${role} has excess/missing RPC execute`);
}
check(!sql(asUser(a, `select sefgh_keys.issue_owned('Bad',array['repo:write'])`),false).ok, 'Direct helper accepted unsupported scope');

const keyA = issue(a), keyA2 = issue(a), keyB = issue(b);
check(/^sk_sefgh_v1_[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{43}$/.test(keyA.secret), 'SQL key format incompatible');
check(sql(`select encode(verifier,'hex') from sefgh_keys.keys where selector=${quote(keyA.key.id)}`).text === createHash('sha256').update(keyA.secret).digest('hex'), 'Digest does not cover whole credential');
const list = JSON.parse(sql(asUser(a, 'select public.sefgh_key_list(null,null)')).text).items;
check(list.length === 2 && !JSON.stringify(list).includes(keyA.secret) && !JSON.stringify(list).includes('verifier'), 'Owner metadata leaked material');
check(JSON.parse(sql(asUser(b, 'select public.sefgh_key_list(null,null)')).text).items.length === 1, 'Cross-owner list');
sql(asUser(b, `select public.sefgh_key_revoke(${quote(keyA.key.id)})`));
check(sql(`select revoked_at is null from sefgh_keys.keys where selector=${quote(keyA.key.id)}`).text === 't', 'Foreign revoke modified owner key');
check(!sql(reserve(keyA, 'stale-policy', 'fixture-old'), false).ok, 'Stale policy accepted');

const attempts = await Promise.all(Array.from({ length: 12 }, (_, i) => asyncSQL(reserve(i % 2 ? keyA : keyA2, `parallel-${i}`))));
check(attempts.filter(x => x.ok).length === 4, 'Concurrent owner quota not atomic');
check(attempts.filter(x => !x.ok).every(x => x.error.includes('SEFGH_KEY_LIMIT')), 'Unexpected concurrent reservation failure');
check(sql(`select count(*) from sefgh_keys.events where owner_id='${a}'`).text === '4', 'Attempt count differs from admitted work');
check(sql(`select used from sefgh_keys.owner_windows where owner_id='${a}'`).text === '4', 'Partial/double owner charge');
check(sql(`select sum(used) from sefgh_keys.key_windows where selector in (${quote(keyA.key.id)},${quote(keyA2.key.id)})`).text === '4', 'Key/owner counters diverged');
const admitted = attempts.find(x => x.ok); const reservation = JSON.parse(admitted.text);
check(!sql(`begin; update sefgh_keys.events set outcome='success',status=null,finished_at=null where request_id=${quote(reservation.RequestID)}; rollback`, false).ok, 'Completed event accepted NULL status/time');
check(!sql(reserve(keyA, reservation.RequestID), false).ok, 'Replay admitted work');
const receipt = { Reservation: reservation, Outcome: 'success', Status: 200, FinishedAt: new Date().toISOString() };
const completed = `select public.sefgh_key_complete(${quote(JSON.stringify(receipt))}::jsonb)`;
check(!sql(asAccountant(`select public.sefgh_key_complete(${quote(JSON.stringify({...receipt,Status:'200'}))}::jsonb)`), false).ok, 'String completion status accepted');
for (const bad of [null,[],{}, {...receipt,extra:'hidden'}, {...receipt,Status:200.5}, {...receipt,FinishedAt:null}, {...receipt,FinishedAt:'infinity'}, {...receipt,Reservation:{...reservation,Owner:b}}, {...receipt,Reservation:{...reservation,RequestID:'unknown'}}]) {
  check(!sql(asAccountant(`select public.sefgh_key_complete(${quote(JSON.stringify(bad))}::jsonb)`),false).ok,'Malformed/conflicting receipt accepted');
}
sql(asAccountant(completed)); sql(asAccountant(completed));
sql(asAccountant(`select public.sefgh_key_recovery(${quote(JSON.stringify(receipt))}::jsonb)`));
check(sql(`select count(*) from sefgh_keys.recovery`).text === '0', 'Committed completion generated duplicate outbox');
const pendingAfterComplete = JSON.parse(sql(asAccountant('select public.sefgh_key_pending(null,null)')).text).items;
check(!pendingAfterComplete.some(x => x.Reservation.RequestID === reservation.RequestID), 'Completed attempt listed as pending');
check(pendingAfterComplete.length === 3 && pendingAfterComplete.every(x => x.Receipt === null), 'Lost-receipt/process-death attempts undiscoverable');
const conflict = { ...receipt, Status: 201 };
check(!sql(asAccountant(`select public.sefgh_key_complete(${quote(JSON.stringify(conflict))}::jsonb)`), false).ok, 'Conflicting completion overwrote result');
const other = JSON.parse(sql(reserve(keyB, 'owner-b-request')).text);
const recovery = { Reservation: other, Outcome: 'failure', Status: 500, FinishedAt: new Date().toISOString() };
sql(asAccountant(`select public.sefgh_key_recovery(${quote(JSON.stringify(recovery))}::jsonb)`));
sql(asAccountant(`select public.sefgh_key_recovery(${quote(JSON.stringify(recovery))}::jsonb)`));
check(sql('select count(*) from sefgh_keys.recovery').text === '1', 'Identical recovery not idempotent');
const contradictory = {...recovery,Outcome:'success',Status:200};
check(!sql(asAccountant(`select public.sefgh_key_complete(${quote(JSON.stringify(contradictory))}::jsonb)`),false).ok,'Completion contradicted saved recovery receipt');
check(sql(`select outcome is null from sefgh_keys.events where request_id=${quote(other.RequestID)}`).text==='t'&&sql('select count(*) from sefgh_keys.recovery').text==='1','Conflicting completion changed pending event/outbox');
check(JSON.parse(sql(asAccountant('select public.sefgh_key_pending(null,null)')).text).items.some(x => x.Reservation.RequestID === other.RequestID && x.Receipt?.Status === 500), 'Stored exact receipt undiscoverable');
const equivalentRecovery={...recovery,FinishedAt:recovery.FinishedAt.replace('Z','+00:00')};
sql(asAccountant(`select public.sefgh_key_complete(${quote(JSON.stringify(equivalentRecovery))}::jsonb)`));
check(sql('select count(*) from sefgh_keys.recovery').text === '0', 'Confirmed recovery left outbox record');

const created = await Promise.all(Array.from({ length: 10 }, () => asyncSQL(asUser(c, `select public.sefgh_key_issue('Concurrent',array['repo:read:public'])`))));
check(created.filter(x => x.ok).length === 4, 'Concurrent active-key cap failed');
check(created.filter(x => !x.ok).every(x => x.error.includes('SEFGH_KEY_ACTIVE_LIMIT')), 'Unexpected concurrent creation failure');
sql(asUser(b, `select sefgh_keys.revoke_owned(${quote(keyB.key.id)})`));
sql(asUser(b, `select public.sefgh_key_revoke(${quote(keyB.key.id)})`));
check(!sql(reserve(keyB, 'after-revoke'), false).ok, 'Revoked key admitted');
// Hold the owner lock in a different native session. The admission starts while
// eligible, waits, then must see the authoritative clock after expiry.
const expiring = issue(b);
sql(`update sefgh_keys.keys set expires_at=clock_timestamp()+interval '0.6 seconds' where selector=${quote(expiring.key.id)}`);
const locker = spawn('docker',args,{stdio:['pipe','pipe','pipe']});
let lockText=''; let resolveLock; const locked = new Promise(resolve => { resolveLock=resolve; });
locker.stdout.on('data',chunk => { lockText+=chunk; if(lockText.includes('LOCKED')) resolveLock(); });
const lockerDone = new Promise((resolve,reject)=>{locker.on('error',reject);locker.on('close',code=>code===0?resolve():reject(new Error('Fixture lock failed')));});
locker.stdin.write(`begin;select pg_advisory_xact_lock(hashtextextended('sefgh-keys:${b}',0));select 'LOCKED';\n`);
await Promise.race([locked,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Fixture lock not acquired')),5000))]);
let waiting;
try {
  waiting=asyncSQL(reserve(expiring,'expiry-lock-wait'));
  let seen=false;
  for(let i=0;i<20;i++) { await new Promise(resolve=>setTimeout(resolve,25)); if(sql(`select exists(select 1 from pg_stat_activity where wait_event='advisory' and position('expiry-lock-wait' in query)>0)`).text==='t') {seen=true;break;} }
  check(seen,'Admission did not wait on owner lock');
  // Policy share lock must cover the owner-lock wait.
  check(!sql(`begin;set local lock_timeout='100ms';update sefgh_keys.policy set revision='not-approved';rollback`,false).ok,'Policy changed during admission');
  await new Promise(resolve=>setTimeout(resolve,700));
} finally { locker.stdin.end('commit;\n');await lockerDone; }
const expired = await waiting;
check(!expired.ok && expired.error.includes('SEFGH_KEY_DENIED'),'Key admitted after expiring during lock wait');
check(sql(`select count(*) from sefgh_keys.events where request_id='expiry-lock-wait'`).text==='0','Rejected expiry left a charge/event');
sql('update sefgh_keys.policy set enabled=false');
check(!sql(asUser(b,`select public.sefgh_key_issue('No policy',array['repo:read:public'])`),false).ok,'Disabled policy issued keys');
check(!sql(reserve(keyA,'disabled-policy'),false).ok,'Disabled policy admitted work');
check(JSON.parse(sql(asUser(b,'select public.sefgh_key_list(null,null)')).text).items.length===2,'Disabled policy hid management metadata');
sql(asUser(b,`select public.sefgh_key_revoke(${quote(expiring.key.id)})`));
// An attempted rollback of the proposed objects inside a transaction leaves
// credentials and legacy state intact. Production rollback disables forwarding;
// dropping the new schema would destroy hashes/audit evidence and is forbidden.
sql('begin;drop schema sefgh_keys cascade;rollback;');
check(sql('select count(*) from sefgh_keys.keys').text==='8','Transactional rollback lost key metadata');
// More than a full page of lost receipts must not starve a later saved receipt.
sql(`insert into sefgh_keys.events(request_id,selector,owner_id,endpoint,revision,started_at)
 select 'page-'||lpad(i::text,3,'0'),${quote(keyA.key.id)},'${a}','public-search','fixture-v1','2026-10-21T00:00:00Z'::timestamptz from generate_series(1,105) i`);
const lastReservation={RequestID:'page-105',Selector:keyA.key.id,Owner:a,Endpoint:'public-search',StartedAt:'2026-10-21T00:00:00Z'};
sql(asAccountant(`select public.sefgh_key_recovery(${quote(JSON.stringify({Reservation:lastReservation,Outcome:'failure',Status:500,FinishedAt:'2026-10-21T00:00:01Z'}))}::jsonb)`));
let cursor=null,pages=0;const discovered=[];
do {
  const page=JSON.parse(sql(asAccountant(`select public.sefgh_key_pending(${cursor?quote(cursor.StartedAt):'null'},${cursor?quote(cursor.RequestID):'null'})`)).text);
  check(page.items.length<=100,'Pending SQL aggregation unbounded');discovered.push(...page.items);cursor=page.next;pages++;
  check(pages<=3,'Pending cursor did not progress');
} while(cursor);
check(pages>=2 && new Set(discovered.map(x=>x.Reservation.RequestID)).size===discovered.length,'Pending pages skipped/duplicated attempts');
check(discovered.some(x=>x.Reservation.RequestID==='page-105'&&x.Receipt?.Status===500),'Lost receipts starved later recovery');
sql(`insert into sefgh_keys.keys(selector,owner_id,name,scopes,verifier,created_at,expires_at)
 select 'listing'||lpad(i::text,9,'0'),'${c}','Expired fixture',array['repo:read:public'],extensions.digest('listing-fixture-'||i,'sha256'),'2020-01-01Z','2020-01-02Z' from generate_series(1,105) i`);
let ownerCursor=null;const metadataPages=[];
do {
  const page=JSON.parse(sql(asUser(c,`select public.sefgh_key_list(${ownerCursor?quote(ownerCursor.CreatedAt):'null'},${ownerCursor?quote(ownerCursor.Selector):'null'})`)).text);
  check(page.items.length<=100,'Owner SQL aggregation unbounded');metadataPages.push(...page.items);ownerCursor=page.next;
  check(metadataPages.length<=109,'Owner pagination repeated a page');
}while(ownerCursor);
check(metadataPages.length===109 && new Set(metadataPages.map(x=>x.id)).size===109,'Owner key history skipped/duplicated rows');
check(sql('select md5(row_to_json(k)::text) from public.api_keys k').text === legacyBefore, 'Legacy key state changed');
check(sql('select count(*) from sefgh_keys.policy').text === '1', 'Fixture policy missing');
sql(await readFile(new URL('../supabase/checks/keys_001_verify.sql',import.meta.url),'utf8'));
sql(await readFile(new URL('../supabase/proposals/keys_001_legacy_truncate.sql',import.meta.url),'utf8'));
check(sql(`select bool_and(not has_table_privilege(r,c.oid,'TRUNCATE')) from unnest(array['anon','authenticated']) r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('api_keys','api_limits','api_logs')`).text==='t','Legacy truncate proposal did not revoke excess privileges');
check(sql(`select bool_and(has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE')) from unnest(array['anon','authenticated']) r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('api_keys','api_limits','api_logs')`).text==='t','Hardening changed legacy CRUD');
check(sql('select md5(row_to_json(k)::text) from public.api_keys k').text===legacyBefore,'Hardening changed legacy row');
console.log(`Native PostgreSQL checks passed: ${assertions}; owner/key concurrency, role denial, completion/recovery, legacy preservation.`);
