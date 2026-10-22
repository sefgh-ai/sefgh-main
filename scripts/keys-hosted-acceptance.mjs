// Opt-in development acceptance of the hosted SQL gateway, not an app server.
// Never executes during ordinary contracts/CI. Credentials come only from env.
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV_PROJECT_REF = 'mraglhrenqwadegvwxts';
export const ACCEPTANCE_POLICY = Object.freeze({
  revision: 'dev-acceptance-v1', enabled: true, max_active: 2, max_name_runes: 80,
  per_key: 2, per_owner: 3, lifetime_seconds: 600, window_seconds: 86400,
  completion_timeout_seconds: 1, charge_mode: 'attempt',
  endpoints: Object.freeze({ 'public-search': 'repo:read:public' }),
});
const scopes = ['repo:read:public'];
const fields = ['id', 'owner_id', 'name', 'prefix', 'scopes', 'created_at', 'expires_at', 'revoked_at'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

class AcceptanceFailure extends Error {
  constructor(step) { super('Key acceptance failed: ' + step); this.step = step; this.cleanupRequired = false; this.accountingReviewRequired = false; }
}
function requireCheck(condition, step) { if (!condition) throw new AcceptanceFailure(step); }
function exactFields(value, names) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === names.length && names.every(n => Object.hasOwn(value, n));
}
function canonicalSecret(raw, prefix) {
  if (typeof raw !== 'string' || !/^sk_sefgh_v1_[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{43}$/.test(raw) || !raw.startsWith(prefix)) return false;
  const suffix = raw.slice(prefix.length), bytes = Buffer.from(suffix, 'base64url');
  return bytes.length === 32 && bytes.toString('base64url') === suffix;
}
function timestampNanos(value) {
  // Date.parse truncates fractions to milliseconds. Keep all RFC3339Nano
  // digits when checking exact SQL receipts, while allowing equivalent offsets.
  const match = typeof value === 'string' && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const local = Date.parse(match[1] + 'Z');
  if (!Number.isFinite(local) || new Date(local).toISOString().slice(0, 19) !== match[1]) return null;
  const zone = match[3], hours = zone === 'Z' ? 0 : Number(zone.slice(1, 3)), minutes = zone === 'Z' ? 0 : Number(zone.slice(4, 6));
  if (hours > 23 || minutes > 59) return null;
  const offset = (zone.startsWith('-') ? -1 : 1) * (hours * 60 + minutes) * 60000;
  return BigInt(local - offset) * 1000000n + BigInt((match[2] ?? '').padEnd(9, '0'));
}
function sameTimestamp(left, right) {
  const instant = timestampNanos(left);
  return instant !== null && instant === timestampNanos(right);
}
function sameReceipt(c, expected) {
  const r = c?.Reservation, e = expected.Reservation;
  return exactFields(c, ['Reservation', 'Outcome', 'Status', 'FinishedAt']) &&
    exactFields(r, ['RequestID', 'Selector', 'Owner', 'Endpoint', 'StartedAt']) &&
    ['RequestID', 'Selector', 'Owner', 'Endpoint'].every(k => r[k] === e[k]) &&
    sameTimestamp(r.StartedAt, e.StartedAt) && c.Outcome === expected.Outcome &&
    c.Status === expected.Status && sameTimestamp(c.FinishedAt, expected.FinishedAt);
}
function pendingMatches(page, receipts, savedID) {
  const byID = new Map(receipts.map(c => [c.Reservation.RequestID, c]));
  return exactFields(page, ['items', 'next']) && page.next === null && Array.isArray(page.items) &&
    page.items.length === receipts.length && new Set(page.items.map(row => row.Reservation?.RequestID)).size === receipts.length &&
    page.items.every(row => {
      const expected = byID.get(row.Reservation?.RequestID);
      return exactFields(row, ['Reservation', 'Receipt']) && expected &&
        sameReceipt({ ...expected, Reservation: row.Reservation }, expected) &&
        (row.Receipt === null || sameReceipt(row.Receipt, expected));
    }) && page.items.some(row => row.Reservation.RequestID === savedID && row.Receipt !== null);
}
function opaqueToken(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 8192 &&
    !/[^\x21-\x7e]/.test(value) && !value.startsWith('sk_') && !value.startsWith('sb_');
}
function metadata(row, owner) {
  return row && typeof row === 'object' && !Array.isArray(row) &&
    Object.keys(row).length === fields.length && fields.every(f => Object.hasOwn(row, f)) &&
    /^[A-Za-z0-9_-]{16}$/.test(row.id) && row.owner_id === owner &&
    row.prefix === 'sk_sefgh_v1_' + row.id + '.' && typeof row.name === 'string' &&
    JSON.stringify(row.scopes) === JSON.stringify(scopes) &&
    Number.isFinite(Date.parse(row.created_at)) && Date.parse(row.expires_at) > Date.parse(row.created_at) &&
    (row.revoked_at === null || Number.isFinite(Date.parse(row.revoked_at)));
}
async function boundedJSON(response) {
  if (!response.body) return null;
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 65536) { void reader.cancel().catch(() => {}); throw new AcceptanceFailure('reply-size'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { throw new AcceptanceFailure('reply-json'); }
}

export async function runHostedKeyAcceptance(config, { fetchImpl = globalThis.fetch, onStart = () => {} } = {}) {
  // Refuse before any network access, including authentication. There is no
  // arbitrary URL, production override, auto-provisioning or policy mutation.
  requireCheck(config.projectRef === DEV_PROJECT_REF && config.allowDevKeyWrites === true, 'development-write-gate');
  requireCheck(/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publicKey ?? ''), 'publishable-config');
  const tokens = [config.userA, config.userB, config.accountant];
  requireCheck(tokens.every(opaqueToken) && new Set(tokens).size === 3, 'credential-config');
  const base = `https://${DEV_PROJECT_REF}.supabase.co`;
  const overall = new AbortController(); const timer = setTimeout(() => overall.abort(), 120000);
  const prefix = 'sefgh-acceptance-' + randomUUID();
  const checks = []; const owners = []; const created = []; const receipts = [];
  let mutationAttempted = false, reservationAttempted = false, failure = null;
  async function request(path, token, args, signal = overall.signal, extraHeaders = {}) {
    try {
      const response = await fetchImpl(base + path, {
        method: args === undefined ? 'GET' : 'POST', redirect: 'error',
        headers: { apikey: config.publicKey, ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(args === undefined ? {} : { 'Content-Type': 'application/json' }), ...extraHeaders },
        ...(args === undefined ? {} : { body: JSON.stringify(args) }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      });
      return { status: response.status, data: await boundedJSON(response) };
    } catch (error) {
      if (error instanceof AcceptanceFailure) throw error;
      throw new AcceptanceFailure('request'); // No transport/response text escapes.
    }
  }
  const rpc = async (name, token, args, signal) => {
    const reply = await request('/rest/v1/rpc/sefgh_key_' + name, token, args, signal);
    if (reply.status >= 200 && reply.status < 300 && ['revoke', 'recovery', 'complete'].includes(name))
      requireCheck(reply.data === null, 'void-reply-' + name);
    return reply;
  };
  function success(reply, step) { requireCheck(reply.status >= 200 && reply.status < 300, step); return reply.data; }
  function sqlFailure(reply, message, step) { requireCheck(reply.status >= 400 && reply.data?.code === 'P0001' && reply.data?.message === message, step); }
  async function listing(token, owner, signal) {
    const page = success(await rpc('list', token, { p_after_created: null, p_after_selector: null }, signal), 'owner-list');
    requireCheck(exactFields(page, ['items', 'next']) && Array.isArray(page.items) && page.items.length <= 100 && page.next === null && page.items.every(row => metadata(row, owner)), 'metadata-only-list');
    return page.items;
  }
  async function issue(token, owner, suffix) {
    mutationAttempted = true;
    const reply = success(await rpc('issue', token, { p_name: prefix + suffix, p_scopes: scopes }), 'issue');
    requireCheck(exactFields(reply, ['key', 'secret']) && metadata(reply.key, owner) && reply.key.name === prefix + suffix &&
      reply.key.revoked_at === null && canonicalSecret(reply.secret, reply.key.prefix), 'show-once-shape');
    const entry = { ...reply.key, token, digest: createHash('sha256').update(reply.secret).digest('hex') };
    created.push(entry); return entry; // No raw key retained after hashing.
  }
  async function reserve(key, suffix) {
    reservationAttempted = true;
    const reply = await rpc('reserve', config.accountant, { p_selector: key.id, p_verifier_hex: key.digest,
      p_request_id: prefix + ':' + suffix, p_endpoint: 'public-search', p_revision: ACCEPTANCE_POLICY.revision });
    if (reply.status >= 200 && reply.status < 300) {
      const r = reply.data;
      requireCheck(r && Object.keys(r).length === 5 && r.RequestID === prefix + ':' + suffix &&
        r.Selector === key.id && r.Owner === key.owner_id && r.Endpoint === 'public-search' &&
        timestampNanos(r.StartedAt) !== null, 'exact-reservation-binding');
    }
    return reply;
  }
  try {
    onStart(Object.freeze({ project_ref: DEV_PROJECT_REF, run_nonce: prefix }));
    for (const token of tokens.slice(0, 2)) {
      const user = success(await request('/auth/v1/user', token), 'verify-session');
      requireCheck(user && uuid.test(user.id) && user.id !== '00000000-0000-0000-0000-000000000000' && user.role === 'authenticated' && user.is_anonymous === false, 'verified-nonanonymous-owner');
      owners.push(user.id);
    }
    requireCheck(owners[0] !== owners[1], 'distinct-owners');
    for (let i = 0; i < 2; i++) requireCheck((await listing(tokens[i], owners[i])).length === 0, 'fresh-test-identities');
    const policy = success(await rpc('policy', config.accountant, {}), 'accountant-policy');
    requireCheck(policy && Object.keys(policy).length === Object.keys(ACCEPTANCE_POLICY).length &&
      Object.entries(ACCEPTANCE_POLICY).every(([k, v]) => JSON.stringify(policy[k]) === JSON.stringify(v)), 'approved-test-policy');
    const pending = success(await rpc('pending', config.accountant, { p_after_started: null, p_after_request: null }), 'pending-preflight');
    requireCheck(exactFields(pending, ['items', 'next']) && Array.isArray(pending.items) && pending.items.length === 0 && pending.next === null, 'fresh-pending-state');
    checks.push('verified-distinct-test-owners', 'exact-test-policy', 'fresh-fixture-state');

    const management = [
      ['issue', { p_name: prefix + '-role-denial', p_scopes: scopes }],
      ['list', { p_after_created: null, p_after_selector: null }],
      ['revoke', { p_selector: 'AAAAAAAAAAAAAAAA' }],
    ];
    const accounting = [
      ['policy', {}], ['lookup', { p_selector: 'AAAAAAAAAAAAAAAA' }],
      ['reserve', { p_selector: 'AAAAAAAAAAAAAAAA', p_verifier_hex: '0'.repeat(64),
        p_request_id: prefix + ':denial', p_endpoint: 'public-search', p_revision: ACCEPTANCE_POLICY.revision }],
      ['complete', { p_receipt: {} }], ['recovery', { p_receipt: {} }],
      ['pending', { p_after_started: null, p_after_request: null }],
    ];
    for (const [token, operations] of [[undefined, [...management, ...accounting]], [config.userA, accounting],
      [config.userB, accounting], [config.accountant, management]]) {
      for (const [name, args] of operations) {
        const denied = await rpc(name, token, args);
        requireCheck([401, 403].includes(denied.status) && denied.data?.code === '42501', 'rpc-role-denial-' + name);
      }
    }
    for (const token of [undefined, ...tokens]) {
      const denied = await request('/rest/v1/keys?select=selector&limit=0', token, undefined, overall.signal, { 'Accept-Profile': 'sefgh_keys' });
      requireCheck(denied.status === 406 && denied.data?.code === 'PGRST106', 'private-schema-denial');
    }
    checks.push('accounting-and-management-role-denial', 'private-schema-not-exposed');

    const a = await issue(config.userA, owners[0], '-a');
    const b = await issue(config.userB, owners[1], '-b');
    const a2 = await issue(config.userA, owners[0], '-a2');
    sqlFailure(await rpc('issue', config.userA, { p_name: prefix + '-over-cap', p_scopes: scopes }), 'SEFGH_KEY_ACTIVE_LIMIT', 'active-key-limit');
    requireCheck((await listing(config.userA, owners[0])).length === 2 && (await listing(config.userB, owners[1])).length === 1, 'owner-list-isolation');
    success(await rpc('revoke', config.userB, { p_selector: a.id }), 'cross-owner-revoke-idempotence');
    requireCheck((await listing(config.userA, owners[0])).find(row => row.id === a.id)?.revoked_at === null, 'cross-owner-revoke-denial');
    const lookup = success(await rpc('lookup', config.accountant, { p_selector: a.id }), 'accountant-lookup');
    requireCheck(exactFields(lookup, [...fields, 'verifier_hex']) && lookup.verifier_hex === a.digest &&
      metadata(Object.fromEntries(fields.map(k => [k, lookup[k]])), owners[0]), 'hash-only-verifier');
    checks.push('show-once-and-metadata-only', 'owner-isolation', 'active-key-limit', 'hash-only-lookup');

    async function race(specifications) {
      // Drain every concurrent request before cleanup, even if one fails.
      const settled = await Promise.allSettled(specifications.map(([key, suffix]) => reserve(key, suffix)));
      const failed = settled.find(r => r.status === 'rejected'); if (failed) throw failed.reason;
      return settled.map(r => r.value);
    }
    const bRace = await race(Array.from({ length: 4 }, (_, i) => [b, 'key-limit-' + i]));
    const bAdmitted = bRace.filter(r => r.status >= 200 && r.status < 300);
    requireCheck(bAdmitted.length === 2, 'atomic-per-key-limit');
    for (const denied of bRace.filter(r => !bAdmitted.includes(r))) sqlFailure(denied, 'SEFGH_KEY_LIMIT', 'atomic-per-key-denial');
    const aRace = await race([a, a2, a, a2].map((key, i) => [key, 'owner-limit-' + i]));
    const aAdmitted = aRace.filter(r => r.status >= 200 && r.status < 300);
    requireCheck(aAdmitted.length === 3 && [a, a2].every(key => aAdmitted.filter(r => r.data?.Selector === key.id).length <= 2), 'atomic-per-owner-limit');
    for (const denied of aRace.filter(r => !aAdmitted.includes(r))) sqlFailure(denied, 'SEFGH_KEY_LIMIT', 'atomic-per-owner-denial');
    const remainingA = aAdmitted.filter(r => r.data.Selector === a.id).length < 2 ? a : a2;
    const admitted = [...bAdmitted, ...aAdmitted];
    for (const reply of admitted) {
      const reservation = success(reply, 'reservation');
      requireCheck(reservation && typeof reservation.RequestID === 'string' && reservation.RequestID.startsWith(prefix + ':') &&
        [a.id, a2.id, b.id].includes(reservation.Selector) && owners.includes(reservation.Owner) &&
        reservation.Endpoint === 'public-search' && timestampNanos(reservation.StartedAt) !== null, 'reservation-binding');
      // Synthetic receipt: no provider operation is represented or retried.
      receipts.push({ Reservation: reservation, Outcome: 'success', Status: 200, FinishedAt: reservation.StartedAt });
    }
    requireCheck(new Set(receipts.map(r => Math.floor(Date.parse(r.Reservation.StartedAt) / 86400000))).size === 1, 'stable-quota-window');
    sqlFailure(await reserve(remainingA, 'owner-over'), 'SEFGH_KEY_LIMIT', 'shared-owner-limit');
    checks.push('atomic-per-key-limit', 'atomic-per-owner-limit', 'separate-owner-quota');

    success(await rpc('recovery', config.accountant, { p_receipt: receipts[0] }), 'save-exact-receipt');
    const page = success(await rpc('pending', config.accountant, { p_after_started: null, p_after_request: null }), 'pending-receipts');
    requireCheck(pendingMatches(page, receipts, receipts[0].Reservation.RequestID), 'recovery-discovery');
    const conflicting = { ...receipts[0], Outcome: 'failure', Status: 503 };
    sqlFailure(await rpc('complete', config.accountant, { p_receipt: conflicting }), 'SEFGH_KEY_ACCOUNTING', 'saved-pending-conflict-denial');
    const unchanged = success(await rpc('pending', config.accountant, { p_after_started: null, p_after_request: null }), 'pending-after-conflict');
    requireCheck(pendingMatches(unchanged, receipts, receipts[0].Reservation.RequestID), 'saved-receipt-preserved');
    for (const receipt of receipts) success(await rpc('complete', config.accountant, { p_receipt: receipt }), 'complete-receipt');
    success(await rpc('complete', config.accountant, { p_receipt: receipts[0] }), 'idempotent-completion');
    sqlFailure(await rpc('complete', config.accountant, { p_receipt: { ...receipts[0], Outcome: 'failure', Status: 503 } }), 'SEFGH_KEY_ACCOUNTING', 'conflicting-completion-denial');
    sqlFailure(await reserve(remainingA, 'after-completion'), 'SEFGH_KEY_LIMIT', 'completed-attempts-remain-charged');
    const first = receipts[0].Reservation;
    const replayKey = created.find(key => key.id === first.Selector);
    sqlFailure(await rpc('reserve', config.accountant, { p_selector: replayKey.id, p_verifier_hex: replayKey.digest,
      p_request_id: first.RequestID, p_endpoint: first.Endpoint, p_revision: ACCEPTANCE_POLICY.revision }), 'SEFGH_KEY_REPLAY', 'reservation-replay-denial');
    const empty = success(await rpc('pending', config.accountant, { p_after_started: null, p_after_request: null }), 'completed-pending-state');
    requireCheck(exactFields(empty, ['items', 'next']) && Array.isArray(empty.items) && empty.items.length === 0 && empty.next === null, 'no-unconfirmed-receipts');
    success(await rpc('revoke', config.userA, { p_selector: a.id }), 'owner-revoke');
    sqlFailure(await reserve(a, 'after-revoke'), 'SEFGH_KEY_DENIED', 'revocation-enforced');
    checks.push('saved-receipt-discovery', 'saved-pending-conflict-denial', 'exact-idempotent-completion', 'conflicting-receipt-denial',
      'completed-attempts-remain-charged', 'reservation-replay-denial', 'revocation');
  } catch (error) { failure = error instanceof AcceptanceFailure ? error : new AcceptanceFailure('unexpected'); }
  finally {
    if (mutationAttempted) {
      const signal = AbortSignal.timeout(15000);
      // Owners and known selectors are independent cleanup obligations. An
      // unavailable discovery/listing must not strand other known keys.
      const cleanup = await Promise.allSettled(owners.map(async (owner, i) => {
        let failed = false;
        async function revokeAll(rows) {
          const results = await Promise.allSettled(rows.map(row => rpc('revoke', tokens[i], { p_selector: row.id }, signal)
            .then(reply => success(reply, 'cleanup-revoke'))));
          if (results.some(r => r.status === 'rejected')) failed = true;
        }
        await revokeAll(created.filter(row => row.owner_id === owner));
        try {
          // Discover a key whose issuance reply was lost; never issue again
          // to retrieve its secret. Only this run's names can be revoked.
          await revokeAll((await listing(tokens[i], owner, signal)).filter(row => row.name.startsWith(prefix) && row.revoked_at === null));
        } catch { failed = true; }
        try {
          if ((await listing(tokens[i], owner, signal)).some(row => row.name.startsWith(prefix) && row.revoked_at === null)) failed = true;
        } catch { failed = true; }
        return !failed;
      }));
      if (cleanup.some(r => r.status === 'rejected' || !r.value)) {
        if (!failure) failure = new AcceptanceFailure('cleanup');
        failure.cleanupRequired = true;
      }
    }
    clearTimeout(timer);
  }
  if (failure) { failure.accountingReviewRequired = reservationAttempted; failure.runNonce = prefix; throw failure; }
  return { project_ref: DEV_PROJECT_REF, run_nonce: prefix, scope: 'hosted SQL gateway with synthetic accounting receipts',
    checks, created_keys: created.length, cleanup: 'new run keys revoked; audit retained',
    limitations: ['No provider or app runtime exercised', 'Expiry, signing-key rotation, disabled-policy recovery and production rollout remain separate acceptance'] };
}

async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Review docs/database/keys-hosted-acceptance.md first.\n' +
      'node scripts/keys-hosted-acceptance.mjs --allow-dev-key-writes --project=' + DEV_PROJECT_REF + '\n' +
      'Environment: SEFGH_KEYS_ACCEPT_PUBLIC_KEY, SEFGH_KEYS_ACCEPT_USER_A, SEFGH_KEYS_ACCEPT_USER_B, SEFGH_KEYS_ACCEPT_ACCOUNTANT.\n' +
      'No SQL seed, identity/credential provisioning, provider call or production override.'); return;
  }
  const allowed = new Set(['--allow-dev-key-writes', '--project=' + DEV_PROJECT_REF]);
  requireCheck(args.length === 2 && args.every(arg => allowed.has(arg)) && new Set(args).size === 2, 'command-gate');
  const result = await runHostedKeyAcceptance({ projectRef: DEV_PROJECT_REF, allowDevKeyWrites: true,
    publicKey: process.env.SEFGH_KEYS_ACCEPT_PUBLIC_KEY, userA: process.env.SEFGH_KEYS_ACCEPT_USER_A,
    userB: process.env.SEFGH_KEYS_ACCEPT_USER_B, accountant: process.env.SEFGH_KEYS_ACCEPT_ACCOUNTANT },
  { onStart: event => console.log(JSON.stringify({ status: 'started', ...event })) });
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(JSON.stringify({ status: 'failed', step: error instanceof AcceptanceFailure ? error.step : 'unexpected',
      run_nonce: error instanceof AcceptanceFailure ? error.runNonce ?? null : null,
      key_cleanup_required: error instanceof AcceptanceFailure ? error.cleanupRequired : true,
      accounting_review_required: error instanceof AcceptanceFailure ? error.accountingReviewRequired : true })); process.exitCode = 1;
  });
}
