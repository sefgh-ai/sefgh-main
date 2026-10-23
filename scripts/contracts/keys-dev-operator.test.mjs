import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign, verify } from 'node:crypto';
import { execFile, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { APPROVED_SETUP_HASH, acceptanceEnvironment, claimOperatorFile, runAcceptanceChild, runDevOperator } from '../keys-dev-operator.mjs';
import * as operatorModule from '../keys-dev-operator.mjs';
import { DEV_PROJECT_REF, ACCEPTANCE_POLICY } from '../keys-hosted-acceptance.mjs';

const base = `https://${DEV_PROJECT_REF}.supabase.co`, instant = 1792670400;
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
const passA = 'fixture-password-A-012345678901234567890', passB = 'fixture-password-B-012345678901234567890';
const runNonce = 'sefgh-acceptance-33333333-3333-4333-8333-333333333333';
const allChecks = ['verified-distinct-test-owners', 'exact-test-policy', 'fresh-fixture-state',
  'accounting-and-management-role-denial', 'private-schema-not-exposed', 'show-once-and-metadata-only',
  'owner-isolation', 'active-key-limit', 'hash-only-lookup', 'atomic-per-key-limit', 'atomic-per-owner-limit',
  'separate-owner-quota', 'saved-receipt-discovery', 'saved-pending-conflict-denial', 'exact-idempotent-completion',
  'conflicting-receipt-denial', 'completed-attempts-remain-charged', 'reservation-replay-denial', 'revocation'];
const completeReceipt = () => ({ passed: true, project_ref: DEV_PROJECT_REF,
  scope: 'hosted SQL gateway with synthetic accounting receipts', run_nonce: runNonce, created_keys: 3,
  checks: [...allChecks], cleanup: 'new run keys revoked; audit retained' });
function fixture({ secondLoginFails = false, wrongOwner = false, deniedLogout = false, sessionLifetime = 3600 } = {}) {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = { ...keys.privateKey.export({ format: 'jwk' }), kid: randomUUID(), alg: 'ES256', use: 'sig' };
  const originalKid = randomUUID();
  const config = { projectRef: DEV_PROJECT_REF, approvedSetupHash: APPROVED_SETUP_HASH, publicKey: 'sb_publishable_fixture',
    currentKid: jwk.kid, originalKid, dashboardCurrentVerified: true, noOtherConsumers: true, privateJwk: jwk,
    userA: { id: a, email: 'a@operator-fixture.invalid', password: passA }, userB: { id: b, email: 'b@operator-fixture.invalid', password: passB } };
  const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const ownerToken = id => {
    const unsigned = encode({ alg: 'ES256', kid: jwk.kid, typ: 'JWT' }) + '.' + encode({
      iss: base + '/auth/v1', role: 'authenticated', aud: 'authenticated', sub: id, exp: instant + sessionLifetime,
    });
    return unsigned + '.' + sign('sha256', Buffer.from(unsigned), { key: keys.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  };
  const tokens = { [a]: ownerToken(a), [b]: ownerToken(b) }, calls = [], accountantTokens = new Set(); let claims = 0;
  const response = (v, status = 200) => new Response(status === 204 ? null : JSON.stringify(v), { status });
  const fetchImpl = async (url, options) => {
    assert.equal(new URL(url).origin, base); assert.equal(options.redirect, 'error');
    const path = new URL(url).pathname, token = options.headers?.Authorization?.slice(7);
    calls.push({ path, token });
    if (path.endsWith('jwks.json')) {
      assert.equal(options.headers, undefined, 'discovery received credentials');
      const { d: _private, ...pub } = jwk;
      return response({ keys: [pub, { ...pub, kid: originalKid }] });
    }
    assert.equal(options.headers.apikey, config.publicKey);
    if (path.endsWith('/token')) {
      assert.equal(new URL(url).search, '?grant_type=password');
      const input = JSON.parse(options.body), owner = input.email === config.userA.email ? config.userA : config.userB;
      assert.equal(input.password, owner.password);
      if (secondLoginFails && owner.id === b) return response({ error: 'sensitive ' + passB }, 500);
      return response({ access_token: tokens[owner.id] });
    }
    if (path.endsWith('/user')) return response({ id: wrongOwner ? randomUUID() : token === tokens[a] ? a : b,
      role: 'authenticated', is_anonymous: false, email_confirmed_at: '2026-10-22T12:00:00Z' });
    if (path.endsWith('/logout')) {
      assert.equal(new URL(url).search, '?scope=global');
      assert.ok(Object.values(tokens).includes(token));
      return response(null, deniedLogout && token === tokens[a] ? 401 : 204);
    }
    accountantTokens.add(token); const parts = token.split('.');
    assert.equal(verify('sha256', Buffer.from(parts[0] + '.' + parts[1]), { key: keys.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url')), true);
    const header = JSON.parse(Buffer.from(parts[0], 'base64url')), payload = JSON.parse(Buffer.from(parts[1], 'base64url'));
    assert.deepEqual(header, { alg: 'ES256', kid: jwk.kid, typ: 'JWT' });
    assert.deepEqual(Object.keys(payload).sort(), ['aud', 'exp', 'iat', 'iss', 'jti', 'role']);
    assert.equal(payload.role, 'sefgh_key_accountant'); assert.equal(payload.iss, base + '/auth/v1');
    assert.equal(payload.aud, 'authenticated'); assert.equal(payload.exp - payload.iat, 300);
    assert.equal(payload.iat, instant); assert.match(payload.jti, /^[a-f0-9-]{36}$/);
    return response(path.endsWith('_policy') ? ACCEPTANCE_POLICY : { items: [], next: null });
  };
  const acceptance = async values => {
    assert.deepEqual(Object.keys(values).sort(), ['accountant', 'publicKey', 'userA', 'userB']);
    assert.equal(values.userA, tokens[a]); assert.equal(values.userB, tokens[b]);
    assert.ok(accountantTokens.has(values.accountant));
    return completeReceipt();
  };
  return { config, fetchImpl, acceptance, calls, tokens, accountantTokens, now: () => instant,
    claimOnce: () => { claims++; return claims === 1; }, getClaims: () => claims };
}

test('operator fixes ES256 role/project/expiry and separately acknowledges two server logouts', async () => {
  const f = fixture(), result = await runDevOperator(f.config, f);
  assert.equal(result.status, 'passed'); assert.equal(result.accountant_tokens_issued, 1);
  assert.equal(f.accountantTokens.size, 1); assert.equal(result.accountant_exp, instant + 300);
  assert.equal(result.server_logout.length, 2); assert.ok(result.server_logout.every(s => s.acknowledged));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(passA + '|' + passB + '|operator-fixture.invalid|' + f.config.privateJwk.d));
  assert.ok(Object.values(f.tokens).every(t => !JSON.stringify(result).includes(t)));
});

test('wrong project/approval, unsafe identity and unconfirmed key state refuse before I/O', async () => {
  for (const edit of [{ projectRef: 'kohwfuxqbllsmvmsfqci' }, { approvedSetupHash: '' }, { dashboardCurrentVerified: false },
    { noOtherConsumers: false }, { publicKey: 'sb_secret_private' }, { originalKid: 'not-a-uuid' }]) {
    const f = fixture(); const result = await runDevOperator({ ...f.config, ...edit }, f);
    assert.equal(result.status, 'needs-review'); assert.equal(f.calls.length, 0); assert.equal(f.getClaims(), 0);
  }
});

test('mismatched private/public key material refuses before even discovery', async () => {
  const f = fixture(); f.config.privateJwk.x = Buffer.alloc(32).toString('base64url');
  const result = await runDevOperator(f.config, f);
  assert.equal(result.step, 'private-public-match'); assert.equal(f.calls.length, 0);
});

test('duplicate owners cannot obtain sessions or mint', async () => {
  const f = fixture(); f.config.userB.id = a;
  const r = await runDevOperator(f.config, f); assert.equal(r.step, 'two-test-identities'); assert.equal(f.calls.length, 0);
});

test('JWKS missing the retained original key or containing private material cannot pass readiness', async () => {
  for (const variant of ['missing-old', 'private', 'duplicate-new']) {
    const f = fixture(); const fetchImpl = async (url, options) => {
      const r = await f.fetchImpl(url, options), value = await r.json();
      if (variant === 'missing-old') value.keys.pop();
      if (variant === 'private') value.keys[0].d = 'private synthetic';
      if (variant === 'duplicate-new') value.keys.push(value.keys[0]);
      return new Response(JSON.stringify(value));
    };
    const result = await runDevOperator(f.config, { ...f, fetchImpl });
    assert.equal(result.status, 'needs-review'); assert.equal(f.getClaims(), 0); assert.equal(f.calls.length, 1);
  }
});

test('a previously claimed run cannot create another session or token', async () => {
  const f = fixture();
  const first = await runDevOperator(f.config, f), second = await runDevOperator(f.config, f);
  assert.equal(first.status, 'passed'); assert.equal(second.step, 'single-run-claim');
  assert.equal(second.accountant_tokens_issued, 0); assert.equal(f.calls.filter(c => c.path.endsWith('/token')).length, 2);
});

test('one failed login still logs out the other verified session without leaking the Auth error', async () => {
  const f = fixture({ secondLoginFails: true }), r = await runDevOperator(f.config, f);
  assert.equal(r.accountant_tokens_issued, 0); assert.equal(r.step, 'password-session');
  assert.equal(r.server_logout.length, 1); assert.equal(r.server_logout[0].acknowledged, true);
  assert.doesNotMatch(JSON.stringify(r), /sensitive|fixture-password/);
});

test('an unexpected online identity is not globally logged out using unverified subject claims', async () => {
  const f = fixture({ wrongOwner: true }), r = await runDevOperator(f.config, f);
  assert.equal(r.step, 'verified-test-owner'); assert.equal(r.accountant_tokens_issued, 0);
  assert.equal(r.server_logout[0].verified, false); assert.equal(f.calls.some(c => c.path.endsWith('/logout')), false);
});

test('401 logout is unacknowledged and cannot skip the other owner or count as success', async () => {
  const f = fixture({ deniedLogout: true }), r = await runDevOperator(f.config, f);
  assert.equal(r.status, 'needs-review'); assert.equal(r.step, 'server-session-cleanup');
  assert.equal(r.server_logout.find(s => s.owner === a).acknowledged, false);
  assert.equal(r.server_logout.find(s => s.owner === b).acknowledged, true);
});

test('acceptance failure still cleans both sessions and conservatively flags accounting/key review', async () => {
  const f = fixture(), r = await runDevOperator(f.config, { ...f, acceptance: async () => { throw Error('private ' + passA); } });
  assert.equal(r.step, 'acceptance'); assert.equal(r.key_cleanup_required, true); assert.equal(r.accounting_review_required, true);
  assert.ok(r.server_logout.every(s => s.acknowledged)); assert.doesNotMatch(JSON.stringify(r), /private|fixture-password/);
});

test('insufficient session lifetime cannot reach accountant issuance', async () => {
  const f = fixture({ sessionLifetime: 299 }), r = await runDevOperator(f.config, f);
  assert.equal(r.step, 'session-claims'); assert.equal(r.accountant_tokens_issued, 0);
});

test('expired sessions are never represented as acknowledged cleanup', async () => {
  const f = fixture(); let seconds = instant;
  const r = await runDevOperator(f.config, { ...f, now: () => seconds, acceptance: async values => {
    const result = await f.acceptance(values); seconds += 4000; return result;
  } });
  assert.equal(r.status, 'needs-review'); assert.ok(r.server_logout.every(s => !s.acknowledged));
  assert.equal(f.calls.some(c => c.path.endsWith('/logout')), false);
});

test('already cancelled and ignored-abort fetches cannot run indefinitely', async () => {
  const stopped = new AbortController(); stopped.abort(); const f = fixture();
  await runDevOperator(f.config, { ...f, signal: stopped.signal }); assert.equal(f.calls.length, 0);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10);
  try {
    const r = await runDevOperator(f.config, { ...f, signal: controller.signal, fetchImpl: () => new Promise(() => {}) });
    assert.equal(r.step, 'request-deadline');
  } finally { clearTimeout(timer); }
});

test('a stalled response body obeys cancellation without exposing response text', async () => {
  const f = fixture(), controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10);
  try {
    const r = await runDevOperator(f.config, { ...f, signal: controller.signal, fetchImpl: async () => new Response(new ReadableStream({ cancel: () => new Promise(() => {}) })) });
    assert.equal(r.step, 'request-deadline');
  } finally { clearTimeout(timer); }
});

test('the acceptance child has only runtime essentials and the four intended configuration values', async () => {
  const values = { publicKey: 'sb_publishable_fixture', userA: 'session-a', userB: 'session-b', accountant: 'accountant-fixture' };
  const env = acceptanceEnvironment(values, { PATH: 'fixture-path', TEMP: 'fixture-temp', NODE_OPTIONS: '--malicious', PRIVATE_JWK: 'secret', AWS_SECRET_ACCESS_KEY: 'private' });
  assert.deepEqual(Object.keys(env).sort(), ['PATH', 'SEFGH_KEYS_ACCEPT_ACCOUNTANT', 'SEFGH_KEYS_ACCEPT_PUBLIC_KEY', 'SEFGH_KEYS_ACCEPT_USER_A', 'SEFGH_KEYS_ACCEPT_USER_B', 'TEMP']);
  const r = await runAcceptanceChild(values, { ambient: {}, execFileImpl: (file, args, options, callback) => {
    assert.equal(file, process.execPath); assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
    assert.ok(args.includes('--project=' + DEV_PROJECT_REF)); assert.equal(options.env.SEFGH_KEYS_ACCEPT_ACCOUNTANT, values.accountant);
    callback(null, JSON.stringify({ status: 'started', project_ref: DEV_PROJECT_REF, run_nonce: runNonce }) + '\n' +
      JSON.stringify(completeReceipt()));
  } });
  assert.equal(r.passed, true);
});

test('child errors/raw stderr and forged/mismatched completion reports never become successful reports', async () => {
  for (const error of [null, Error('private synthetic child error')]) {
    const r = await runAcceptanceChild({}, { execFileImpl: (_file, _args, _options, callback) => callback(error, 'private sensitive stdout', 'private stderr') });
    assert.equal(r.passed, false); assert.equal(r.key_cleanup_required, true); assert.doesNotMatch(JSON.stringify(r), /private|sensitive/);
  }
});

test('exclusive run journal survives a competing process and never overwrites an earlier claim', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'sefgh-operator-journal-'));
  try {
    const moduleURL = new URL('../keys-dev-operator.mjs', import.meta.url).href;
    const source = `import(${JSON.stringify(moduleURL)}).then(m=>process.stdout.write(String(m.claimOperatorFile(process.argv[1],{fixture:true}))));`;
    const results = await Promise.all([1, 2].map(() => promisify(execFile)(process.execPath, ['-e', source, directory], { windowsHide: true, timeout: 5000 })));
    assert.deepEqual(results.map(r => r.stdout).sort(), ['false', 'true']);
    assert.equal(claimOperatorFile(directory, { overwrite: true }), false);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'operator-run.json'), 'utf8')), { fixture: true });
  } finally { unlinkSync(join(directory, 'operator-run.json')); rmdirSync(directory); }
});

test('CLI help is harmless and missing explicit run gates refuse before local/network access', () => {
  const file = fileURLToPath(new URL('../keys-dev-operator.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [file, '--help'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
  assert.equal(help.status, 0); assert.match(help.stdout, /Development operator only/);
  const refusal = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: 5000, windowsHide: true });
  assert.equal(refusal.status, 1); assert.deepEqual(JSON.parse(refusal.stderr), { status: 'refused', step: 'command-gate' });
});

test('a lost login reply explicitly records unknown session outcome instead of an empty clean list', async () => {
  const f = fixture();
  const fetchImpl = (url, options) => new URL(url).pathname.endsWith('/token')
    ? Promise.reject(Error('sensitive lost session response')) : f.fetchImpl(url, options);
  const r = await runDevOperator(f.config, { ...f, fetchImpl });
  assert.equal(r.status, 'needs-review'); assert.equal(r.session_outcome_unknown, true);
  assert.equal(r.server_session_cleanup_verified, false); assert.equal(r.accountant_tokens_issued, 0);
});

test('unexpected policy and preexisting pending state cannot launch acceptance', async () => {
  for (const bad of ['policy', 'pending']) {
    const f = fixture(); let launched = false;
    const fetchImpl = async (url, options) => {
      const reply = await f.fetchImpl(url, options);
      if (new URL(url).pathname.endsWith('_' + bad)) return new Response(JSON.stringify(bad === 'policy' ? { ...ACCEPTANCE_POLICY, per_owner: 999 } : { items: [{}], next: null }));
      return reply;
    };
    const r = await runDevOperator(f.config, { ...f, fetchImpl, acceptance: async values => { launched = true; return f.acceptance(values); } });
    assert.equal(launched, false); assert.equal(r.status, 'needs-review'); assert.ok(r.server_logout.every(s => s.acknowledged));
  }
});

test('child success without the required acceptance checks is refused', async () => {
  const r = await runAcceptanceChild({}, { execFileImpl: (_file, _args, _options, callback) => callback(null,
    JSON.stringify({ status: 'started', project_ref: DEV_PROJECT_REF, run_nonce: runNonce }) + '\n' +
    JSON.stringify({ project_ref: DEV_PROJECT_REF, run_nonce: runNonce, created_keys: 3, checks: [], cleanup: 'new run keys revoked; audit retained' })) });
  assert.equal(r.passed, false);
});

test('Windows CLI refuses a shared local input file before reading operator configuration', { skip: process.platform !== 'win32' }, () => {
  const temporary = mkdtempSync(join(tmpdir(), 'sefgh-operator-acl-'));
  const parent = join(temporary, 'SEFGH'), directory = join(parent, 'migration-dev'), file = join(directory, 'test-emails.json');
  mkdirSync(directory, { recursive: true });
  const env = { ...process.env, LOCALAPPDATA: temporary };
  const ps = script => {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env, encoding: 'utf8', timeout: 10000, windowsHide: true });
    assert.equal(r.status, 0, 'fixture ACL setup failed');
  };
  try {
    ps("$ErrorActionPreference='Stop';$p=Join-Path $env:LOCALAPPDATA 'SEFGH\\migration-dev';$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$a=New-Object Security.AccessControl.DirectorySecurity;$a.SetOwner($sid);$a.SetAccessRuleProtection($true,$false);$a.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')));Set-Acl -LiteralPath $p -AclObject $a");
    writeFileSync(file, JSON.stringify({ userA: 'a@fixture.invalid', userB: 'b@fixture.invalid' }));
    const cli = fileURLToPath(new URL('../keys-dev-operator.mjs', import.meta.url));
    const allowed = spawnSync(process.execPath, [cli, '--status'], { env, encoding: 'utf8', timeout: 15000, windowsHide: true });
    assert.equal(allowed.status, 0); assert.equal(JSON.parse(allowed.stdout).emails_ready, true);
    ps("$ErrorActionPreference='Stop';$p=Join-Path $env:LOCALAPPDATA 'SEFGH\\migration-dev\\test-emails.json';$a=Get-Acl -LiteralPath $p;$everyone=New-Object Security.Principal.SecurityIdentifier('S-1-1-0');$a.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($everyone,'Read','Allow')));Set-Acl -LiteralPath $p -AclObject $a");
    const refused = spawnSync(process.execPath, [cli, '--status'], { env, encoding: 'utf8', timeout: 15000, windowsHide: true });
    assert.equal(refused.status, 1); assert.deepEqual(JSON.parse(refused.stderr), { status: 'refused', step: 'operator-acl' });
  } finally {
    // Only this generated, known fixture tree; no recursive deletion or secrets.
    unlinkSync(file); rmdirSync(directory); rmdirSync(parent); rmdirSync(temporary);
  }
});

test('CLI signal handling aborts work but retains both independent logout attempts and a report', async () => {
  assert.equal(typeof operatorModule.runInterruptibleOperator, 'function');
  for (const signalName of ['SIGINT', 'SIGTERM']) {
    const f = fixture(), signals = new EventEmitter(); let handlersDuringCleanup = false;
    const fetchImpl = (url, options) => {
      if (new URL(url).pathname.endsWith('/logout')) {
        handlersDuringCleanup = signals.listenerCount(signalName) === 1;
        signals.emit(signalName); // A repeated interrupt must not bypass cleanup.
      }
      return f.fetchImpl(url, options);
    };
    const r = await operatorModule.runInterruptibleOperator(f.config, { ...f, fetchImpl,
      acceptance: async (_values, { signal }) => {
        assert.equal(signals.listenerCount(signalName), 1); signals.emit(signalName);
        assert.equal(signal.aborted, true); throw Error('aborted synthetic child');
      } }, signals);
    assert.equal(r.interrupted, true); assert.equal(r.termination_signal, signalName);
    assert.equal(r.status, 'needs-review'); assert.equal(r.accounting_review_required, true);
    assert.ok(r.server_logout.every(s => s.acknowledged)); assert.equal(handlersDuringCleanup, true);
    assert.equal(signals.listenerCount('SIGINT'), 0); assert.equal(signals.listenerCount('SIGTERM'), 0);
  }
});

test('sessions must still have five minutes immediately before accountant issuance', async () => {
  const f = fixture({ sessionLifetime: 301 }); let seconds = instant, users = 0, launched = false;
  const fetchImpl = async (url, options) => {
    const reply = await f.fetchImpl(url, options);
    if (new URL(url).pathname.endsWith('/user') && ++users === 2) seconds += 32;
    return reply;
  };
  const r = await runDevOperator(f.config, { ...f, fetchImpl, now: () => seconds,
    acceptance: async () => { launched = true; return completeReceipt(); } });
  assert.equal(r.step, 'session-expiry-before-issuance'); assert.equal(r.accountant_tokens_issued, 0);
  assert.equal(launched, false); assert.equal(f.getClaims(), 1); assert.ok(r.server_logout.every(s => s.acknowledged));
});

test('session freshness is rechecked after gateway preflight and before the acceptance child', async () => {
  const f = fixture({ sessionLifetime: 301 }); let seconds = instant, launched = false;
  const fetchImpl = async (url, options) => {
    const reply = await f.fetchImpl(url, options);
    if (new URL(url).pathname.endsWith('sefgh_key_pending')) seconds += 32;
    return reply;
  };
  const r = await runDevOperator(f.config, { ...f, fetchImpl, now: () => seconds,
    acceptance: async () => { launched = true; return completeReceipt(); } });
  assert.equal(r.step, 'session-expiry-before-acceptance'); assert.equal(r.accountant_tokens_issued, 1);
  assert.equal(launched, false); assert.equal(f.getClaims(), 1); assert.ok(r.server_logout.every(s => s.acknowledged));
});

test('child receipts missing any formerly unchecked quota/cap/hash proof cannot pass', async () => {
  for (const missing of ['active-key-limit', 'atomic-per-key-limit', 'hash-only-lookup', 'separate-owner-quota']) {
    const receipt = completeReceipt(); receipt.checks = receipt.checks.filter(name => name !== missing);
    const r = await runAcceptanceChild({}, { execFileImpl: (_file, _args, _options, callback) => callback(null,
      JSON.stringify({ status: 'started', project_ref: DEV_PROJECT_REF, run_nonce: runNonce }) + '\n' + JSON.stringify(receipt)) });
    assert.equal(r.passed, false, missing);
  }
});

test('all validated child checks and cleanup proof survive in the allowlisted final receipt', async () => {
  const f = fixture(), report = await runDevOperator(f.config, f);
  assert.deepEqual(report.acceptance_receipt?.checks, allChecks);
  assert.equal(report.acceptance_receipt.cleanup, 'new run keys revoked; audit retained');
  assert.equal(report.acceptance_receipt.run_nonce, runNonce);
  assert.equal(report.acceptance_receipt.project_ref, DEV_PROJECT_REF);
});
