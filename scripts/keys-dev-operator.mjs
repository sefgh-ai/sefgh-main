// Trusted development operator. Never imported by the app or ordinary runtime.
// It does not create users, generate/import/rotate signing keys or change SQL.
import { createECDH, createPrivateKey, createPublicKey, randomUUID, sign, verify } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, lstatSync, openSync, closeSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV_PROJECT_REF, ACCEPTANCE_POLICY } from './keys-hosted-acceptance.mjs';

export const APPROVED_SETUP_HASH = 'ef96978f62dc4630d3a8b3e0ad3f681a3eca625a3c6cffebd13623cc51c849d9';
const base = `https://${DEV_PROJECT_REF}.supabase.co`;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const nonce = /^sefgh-acceptance-[a-f0-9-]{36}$/;
const runnerFile = fileURLToPath(new URL('./keys-hosted-acceptance.mjs', import.meta.url));
const requiredChecks = Object.freeze(['verified-distinct-test-owners', 'exact-test-policy', 'fresh-fixture-state',
  'accounting-and-management-role-denial', 'private-schema-not-exposed', 'show-once-and-metadata-only',
  'owner-isolation', 'active-key-limit', 'hash-only-lookup', 'atomic-per-key-limit', 'atomic-per-owner-limit',
  'separate-owner-quota', 'saved-receipt-discovery', 'saved-pending-conflict-denial', 'exact-idempotent-completion',
  'conflicting-receipt-denial', 'completed-attempts-remain-charged', 'reservation-replay-denial', 'revocation']);
class OperatorFailure extends Error { constructor(step) { super('Development operator refused: ' + step); this.step = step; } }
function check(ok, step) { if (!ok) throw new OperatorFailure(step); }
function opaque(value) { return typeof value === 'string' && value.length > 0 && value.length <= 8192 && !/[^\x21-\x7e]/.test(value); }
function part(value, step) {
  check(typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value), step);
  const bytes = Buffer.from(value, 'base64url');
  check(bytes.length === 32 && bytes.toString('base64url') === value, step); return bytes;
}
function privateKey(config) {
  const j = config.privateJwk;
  check(j && j.kty === 'EC' && j.crv === 'P-256' && j.kid === config.currentKid &&
    (j.alg === undefined || j.alg === 'ES256') && (j.use === undefined || j.use === 'sig'), 'private-key');
  const d = part(j.d, 'private-key'), x = part(j.x, 'private-key'), y = part(j.y, 'private-key');
  const ec = createECDH('prime256v1'); ec.setPrivateKey(d); const publicBytes = ec.getPublicKey();
  check(publicBytes.subarray(1, 33).equals(x) && publicBytes.subarray(33).equals(y), 'private-public-match');
  return createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: j.d, x: j.x, y: j.y }, format: 'jwk' });
}
function jwtPart(token, index) {
  check(opaque(token) && token.split('.').length === 3, 'session-token');
  const encoded = token.split('.')[index];
  check(/^[A-Za-z0-9_-]+$/.test(encoded), 'session-token');
  const bytes = Buffer.from(encoded, 'base64url');
  check(bytes.toString('base64url') === encoded, 'session-token');
  return JSON.parse(bytes.toString('utf8'));
}
function mint(key, kid, seconds) {
  const header = { alg: 'ES256', kid, typ: 'JWT' };
  const payload = { iss: base + '/auth/v1', aud: 'authenticated', role: 'sefgh_key_accountant', iat: seconds, exp: seconds + 300, jti: randomUUID() };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = encode(header) + '.' + encode(payload);
  const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' });
  check(signature.length === 64 && verify('sha256', Buffer.from(unsigned), { key: createPublicKey(key), dsaEncoding: 'ieee-p1363' }, signature), 'local-signature');
  return { token: unsigned + '.' + signature.toString('base64url'), exp: payload.exp };
}
async function request(fetchImpl, path, options, signal, json = true) {
  check(!signal.aborted, 'request-deadline');
  let reader;
  const work = (async () => {
    const response = await fetchImpl(base + path, { ...options, redirect: 'error', signal });
    if (!json) { void response.body?.cancel().catch(() => {}); return { status: response.status }; }
    if (!response.body) return { status: response.status, data: null };
    reader = response.body.getReader(); const chunks = []; let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength; check(size <= 65536, 'reply-size'); chunks.push(Buffer.from(value));
      }
      return { status: response.status, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
    } finally { reader.releaseLock(); }
  })();
  let abort;
  const stopped = new Promise((_, reject) => {
    abort = () => { void reader?.cancel().catch(() => {}); reject(new OperatorFailure('request-deadline')); };
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
  try { return await Promise.race([work, stopped]); }
  catch (error) { throw error instanceof OperatorFailure ? error : new OperatorFailure('request'); }
  finally { signal.removeEventListener('abort', abort); }
}

export function acceptanceEnvironment(values, ambient = process.env) {
  // No NODE_OPTIONS, signing JWK, passwords, admin credentials, project secrets
  // or arbitrary inherited variables reach the acceptance subprocess.
  const env = {};
  for (const name of ['SystemRoot', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'PATHEXT', 'LANG', 'LC_ALL'])
    if (typeof ambient[name] === 'string') env[name] = ambient[name];
  if (ambient.PATH || ambient.Path) env.PATH = ambient.PATH || ambient.Path;
  return { ...env, SEFGH_KEYS_ACCEPT_PUBLIC_KEY: values.publicKey, SEFGH_KEYS_ACCEPT_USER_A: values.userA,
    SEFGH_KEYS_ACCEPT_USER_B: values.userB, SEFGH_KEYS_ACCEPT_ACCOUNTANT: values.accountant };
}

function validatedReceipt(result, expectedNonce) {
  check(result?.project_ref === DEV_PROJECT_REF && nonce.test(expectedNonce) && result.run_nonce === expectedNonce &&
    result.created_keys === 3 && result.scope === 'hosted SQL gateway with synthetic accounting receipts' &&
    result.cleanup === 'new run keys revoked; audit retained' && Array.isArray(result.checks) &&
    result.checks.length === requiredChecks.length && new Set(result.checks).size === requiredChecks.length &&
    requiredChecks.every(name => result.checks.includes(name)), 'acceptance-receipt');
  // Return an allowlisted receipt; never preserve arbitrary child properties.
  return { project_ref: DEV_PROJECT_REF, run_nonce: expectedNonce, created_keys: 3,
    scope: 'hosted SQL gateway with synthetic accounting receipts', checks: [...requiredChecks],
    cleanup: 'new run keys revoked; audit retained' };
}

export async function runAcceptanceChild(values, { execFileImpl = execFile, ambient = process.env, signal } = {}) {
  return new Promise(resolveResult => {
    execFileImpl(process.execPath, [runnerFile, '--allow-dev-key-writes', '--project=' + DEV_PROJECT_REF], {
      env: acceptanceEnvironment(values, ambient), windowsHide: true, shell: false, timeout: 155000,
      maxBuffer: 65536, ...(signal ? { signal } : {}),
    }, (error, stdout) => {
      // Never forward child stderr, command, environment or raw error objects.
      let runNonce = null;
      try {
        const firstNewline = stdout.indexOf('\n');
        const started = JSON.parse(stdout.slice(0, firstNewline));
        if (started.status === 'started' && started.project_ref === DEV_PROJECT_REF && nonce.test(started.run_nonce)) runNonce = started.run_nonce;
        check(!error && runNonce, 'acceptance-child');
        const result = JSON.parse(stdout.slice(firstNewline + 1));
        resolveResult({ passed: true, ...validatedReceipt(result, runNonce) });
      } catch { resolveResult({ passed: false, run_nonce: runNonce, key_cleanup_required: true, accounting_review_required: true }); }
    });
  });
}

export async function runDevOperator(config, { fetchImpl = globalThis.fetch, claimOnce,
  acceptance = runAcceptanceChild, now = () => Math.floor(Date.now() / 1000), signal } = {}) {
  const sessions = []; let reason = null, childReport = null, acceptedReceipt = null, issued = false, expires = null, claimed = false, loginAttempts = 0;
  const overall = new AbortController(); const timer = setTimeout(() => overall.abort(), 210000);
  const combined = signal ? AbortSignal.any([signal, overall.signal]) : overall.signal;
  const deadline = parent => AbortSignal.any([parent, AbortSignal.timeout(8000)]);
  const authHeaders = token => ({ apikey: config.publicKey, ...(token ? { Authorization: 'Bearer ' + token } : {}) });
  let phase = 'configuration';
  try {
    check(config.projectRef === DEV_PROJECT_REF && config.approvedSetupHash === APPROVED_SETUP_HASH, 'approved-development-target');
    check(/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publicKey ?? ''), 'publishable-config');
    check(uuid.test(config.originalKid) && uuid.test(config.currentKid) && config.originalKid !== config.currentKid &&
      config.dashboardCurrentVerified === true && config.noOtherConsumers === true, 'dashboard-evidence');
    const owners = [config.userA, config.userB];
    check(owners.every(u => u && uuid.test(u.id) && typeof u.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email) &&
      typeof u.password === 'string' && u.password.length >= 24 && u.password.length <= 256) &&
      owners[0].id !== owners[1].id && owners[0].email.toLowerCase() !== owners[1].email.toLowerCase(), 'two-test-identities');
    check(typeof claimOnce === 'function' && !combined.aborted, 'single-run-claim');
    const key = privateKey(config);
    phase = 'jwks';
    const jwks = await request(fetchImpl, '/auth/v1/.well-known/jwks.json', { method: 'GET' }, deadline(combined));
    const published = jwks.data?.keys;
    check(jwks.status === 200 && Array.isArray(published) && published.length <= 20 && published.every(k => k && !Object.hasOwn(k, 'd')), 'jwks');
    const matches = published.filter(k => k.kid === config.currentKid);
    check(matches.length === 1 && matches[0].kty === 'EC' && matches[0].crv === 'P-256' && matches[0].alg === 'ES256' &&
      matches[0].x === config.privateJwk.x && matches[0].y === config.privateJwk.y &&
      published.some(k => k.kid === config.originalKid), 'jwks-key-match');
    phase = 'single-run-claim';
    claimed = await claimOnce({ project_ref: DEV_PROJECT_REF, proposal_sha256: APPROVED_SETUP_HASH,
      kid: config.currentKid, claimed_at: now(), jwt_issuance_may_occur: true });
    check(claimed === true, 'single-run-claim');
    for (const owner of owners) {
      phase = 'password-session';
      loginAttempts++;
      const reply = await request(fetchImpl, '/auth/v1/token?grant_type=password', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ email: owner.email, password: owner.password }),
      }, deadline(combined));
      check(reply.status === 200 && opaque(reply.data?.access_token), 'password-session');
      const token = reply.data.access_token;
      const session = { token, owner: owner.id, verified: false, acknowledged: false, exp: 0 }; sessions.push(session);
      const header = jwtPart(token, 0), claims = jwtPart(token, 1); session.exp = claims.exp;
      check(header.alg === 'ES256' && header.kid === config.currentKid && claims.sub === owner.id &&
        claims.iss === base + '/auth/v1' && claims.role === 'authenticated' && claims.aud === 'authenticated' &&
        Number.isSafeInteger(claims.exp) && claims.exp > now() + 300, 'session-claims');
      // Decoded claims are only consistency/expiry checks. Auth verifies identity.
      const user = await request(fetchImpl, '/auth/v1/user', { method: 'GET', headers: authHeaders(token) }, deadline(combined));
      check(user.status === 200 && user.data?.id === owner.id && user.data.role === 'authenticated' &&
        user.data.is_anonymous === false && Number.isFinite(Date.parse(user.data.email_confirmed_at)), 'verified-test-owner');
      session.verified = true;
    }
    phase = 'accountant-token';
    check(!combined.aborted, 'request-deadline');
    const issueTime = now();
    check(sessions.every(s => s.verified && s.exp > issueTime + 300), 'session-expiry-before-issuance');
    const accountant = mint(key, config.currentKid, issueTime); issued = true; expires = accountant.exp;
    phase = 'accountant-gateway';
    for (const [name, args] of [['policy', {}], ['pending', { p_after_started: null, p_after_request: null }]]) {
      const reply = await request(fetchImpl, '/rest/v1/rpc/sefgh_key_' + name, { method: 'POST',
        headers: { ...authHeaders(accountant.token), 'Content-Type': 'application/json' }, body: JSON.stringify(args) }, deadline(combined));
      check(reply.status >= 200 && reply.status < 300, 'accountant-gateway');
      const value = reply.data;
      if (name === 'policy') check(value && Object.keys(value).length === Object.keys(ACCEPTANCE_POLICY).length &&
        Object.entries(ACCEPTANCE_POLICY).every(([k, v]) => JSON.stringify(value[k]) === JSON.stringify(v)), 'exact-test-policy');
      else check(value && Object.keys(value).length === 2 && value.next === null && Array.isArray(value.items) && value.items.length === 0, 'fresh-pending-state');
    }
    const launchTime = now();
    check(sessions.every(s => s.verified && s.exp > launchTime + 300), 'session-expiry-before-acceptance');
    phase = 'acceptance';
    childReport = await acceptance({ publicKey: config.publicKey, userA: sessions[0].token,
      userB: sessions[1].token, accountant: accountant.token }, { signal: combined });
    check(childReport?.passed === true, 'acceptance');
    acceptedReceipt = validatedReceipt(childReport, childReport.run_nonce);
  } catch (error) { reason = error instanceof OperatorFailure ? error.step : phase; }
  finally {
    // Independent cleanup, with a new budget even after the main operation aborts.
    await Promise.allSettled(sessions.map(async session => {
      if (!session.verified || session.exp <= now()) return;
      const reply = await request(fetchImpl, '/auth/v1/logout?scope=global', {
        method: 'POST', headers: authHeaders(session.token),
      }, AbortSignal.timeout(8000), false);
      session.acknowledged = reply.status >= 200 && reply.status < 300;
    }));
    clearTimeout(timer);
  }
  const cleanupVerified = sessions.length === 2 && sessions.every(s => s.verified && s.acknowledged);
  return { project_ref: DEV_PROJECT_REF, status: reason || !cleanupVerified ? 'needs-review' : 'passed',
    step: reason ?? (cleanupVerified ? 'complete' : 'server-session-cleanup'), claimed, accountant_tokens_issued: issued ? 1 : 0,
    accountant_exp: expires, acceptance_run_nonce: nonce.test(childReport?.run_nonce ?? '') ? childReport.run_nonce : null,
    acceptance_passed: acceptedReceipt !== null, acceptance_receipt: acceptedReceipt,
    server_logout: sessions.map(s => ({ owner: s.owner, verified: s.verified, acknowledged: s.acknowledged })),
    server_session_cleanup_verified: cleanupVerified,
    session_outcome_unknown: loginAttempts !== sessions.length || sessions.some(s => !s.verified),
    local_session_disposal: 'operator process must exit; no persistent session store',
    key_cleanup_required: childReport?.key_cleanup_required === true || (phase === 'acceptance' && !!reason),
    accounting_review_required: childReport?.accounting_review_required === true || (phase === 'acceptance' && !!reason),
    remaining: ['Restore original key and revoke imported key through Dashboard', 'Record cooldown/expiry evidence; do not mint another token', 'Retain test identities and audit data'] };
}

export async function runInterruptibleOperator(config, options = {}, signals = process, publish = () => {}) {
  const shutdown = new AbortController();
  const interrupt = name => { if (!shutdown.signal.aborted) shutdown.abort(name); };
  const onInterrupt = () => interrupt('SIGINT'), onTerminate = () => interrupt('SIGTERM');
  // Keep handlers installed through independent logout and report publication;
  // repeated supported signals cannot restore the default immediate exit.
  signals.on('SIGINT', onInterrupt); signals.on('SIGTERM', onTerminate);
  try {
    const signal = options.signal ? AbortSignal.any([options.signal, shutdown.signal]) : shutdown.signal;
    const report = { ...await runDevOperator(config, { ...options, signal }),
      interrupted: shutdown.signal.aborted, termination_signal: shutdown.signal.aborted ? shutdown.signal.reason : null };
    await publish(report); return report;
  } finally { signals.removeListener('SIGINT', onInterrupt); signals.removeListener('SIGTERM', onTerminate); }
}

export function claimOperatorFile(directory, record) {
  let fd;
  try { fd = openSync(join(directory, 'operator-run.json'), 'wx', 0o600); writeFileSync(fd, JSON.stringify(record)); return true; }
  catch (error) { if (error.code === 'EEXIST') return false; throw new OperatorFailure('single-run-claim'); }
  finally { if (fd !== undefined) closeSync(fd); }
}
function protectedDirectory() {
  check(process.platform === 'win32' && process.env.LOCALAPPDATA, 'windows-operator-directory');
  const directory = resolve(process.env.LOCALAPPDATA, 'SEFGH', 'migration-dev');
  // Verify current-user ownership/only FullControl ACE and no reparse points.
  const script = "$ErrorActionPreference='Stop'; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $root=Join-Path $env:LOCALAPPDATA 'SEFGH\\migration-dev'; $paths=@((Split-Path -Parent $root),$root); foreach($p in $paths){$i=Get-Item -LiteralPath $p;if(-not $i.PSIsContainer -or ($i.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'path'}}; $items=@((Get-Item -LiteralPath $root))+@(Get-ChildItem -LiteralPath $root -Force); foreach($item in $items){if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'link'};$a=Get-Acl -LiteralPath $item.FullName;if($a.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or @($a.Access).Count -ne 1){throw 'owner'};$r=$a.Access[0];if($r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or $r.AccessControlType -ne 'Allow' -or $r.FileSystemRights -ne 'FullControl'){throw 'acl'}};[Console]::Write('OK')";
  try { check(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }) === 'OK', 'operator-acl'); }
  catch { throw new OperatorFailure('operator-acl'); } return directory;
}
function readLocal(directory, name, json = true) {
  try {
    const path = join(directory, name), stat = lstatSync(path);
    check(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 65536, 'local-config');
    const text = readFileSync(path, 'utf8'); return json ? JSON.parse(text) : text.trim();
  } catch { throw new OperatorFailure('local-config'); }
}
async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Development operator only. Review docs/database/keys-dev-operator.md.\n' +
      'node scripts/keys-dev-operator.mjs --status\n' +
      'node scripts/keys-dev-operator.mjs --run --project=' + DEV_PROJECT_REF + ' --approved-setup=' + APPROVED_SETUP_HASH); return;
  }
  const runArgs = new Set(['--run', '--project=' + DEV_PROJECT_REF, '--approved-setup=' + APPROVED_SETUP_HASH]);
  check((args.length === 1 && args[0] === '--status') || (args.length === 3 && new Set(args).size === 3 && args.every(a => runArgs.has(a))), 'command-gate');
  const directory = protectedDirectory();
  if (args[0] === '--status') {
    const present = Object.fromEntries(['test-emails.json', 'dashboard.json', 'identities.json', 'signing-private.jwk', 'publishable.key', 'operator-run.json'].map(n => [n, existsSync(join(directory, n))]));
    const emails = present['test-emails.json'] ? readLocal(directory, 'test-emails.json') : {};
    console.log(JSON.stringify({ project_ref: DEV_PROJECT_REF, files_present: present,
      emails_ready: typeof emails.userA === 'string' && emails.userA.includes('@') && typeof emails.userB === 'string' && emails.userB.includes('@') && emails.userA.toLowerCase() !== emails.userB.toLowerCase() })); return;
  }
  const dashboard = readLocal(directory, 'dashboard.json'), identities = readLocal(directory, 'identities.json');
  const report = await runInterruptibleOperator({ ...dashboard, userA: identities.userA, userB: identities.userB,
    publicKey: readLocal(directory, 'publishable.key', false), privateJwk: readLocal(directory, 'signing-private.jwk') },
  { claimOnce: record => claimOperatorFile(directory, record) }, process, result => console.log(JSON.stringify(result)));
  if (report.status !== 'passed') process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(JSON.stringify({ status: 'refused', step: error instanceof OperatorFailure ? error.step : 'operator' })); process.exitCode = 1;
  });
}
