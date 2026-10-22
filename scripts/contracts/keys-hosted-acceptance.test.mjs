import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { ACCEPTANCE_POLICY, DEV_PROJECT_REF, runHostedKeyAcceptance } from '../keys-hosted-acceptance.mjs';

const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
const config = () => ({ projectRef: DEV_PROJECT_REF, allowDevKeyWrites: true, publicKey: 'sb_publishable_fixture', userA: 'user-a', userB: 'user-b', accountant: 'accountant' });
function gateway({ loseIssue = false, sameOwner = false, badReservation = false, blockCleanup = false, badSecret = false, leakedListField = false,
  delayedReserve = false, ignoreSavedConflict = false, refundCompleted = false, observeConcurrency = false } = {}) {
  const keys = new Map(), events = new Map(), calls = []; let issued = 0;
  let inFlight = 0;
  const current = new Map(), peaks = new Map();
  const response = (value, status = 200) => new Response(value === null ? 'null' : JSON.stringify(value), { status });
  const error = message => response({ code: 'P0001', message }, 400);
  const publicRow = row => Object.fromEntries(Object.entries(row).filter(([k]) => !['digest'].includes(k)));
  async function fetchImpl(url, options) {
    assert.equal(new URL(url).origin, `https://${DEV_PROJECT_REF}.supabase.co`);
    assert.equal(options.redirect, 'error'); assert.equal(options.headers.apikey, 'sb_publishable_fixture');
    assert.ok(options.signal instanceof AbortSignal);
    const role = options.headers.Authorization?.slice(7), path = new URL(url).pathname;
    if (path === '/auth/v1/user') return response({ id: role === 'user-a' || sameOwner ? a : b, role: 'authenticated', is_anonymous: false });
    if (path === '/rest/v1/keys') return response({ code: 'PGRST106' }, 406);
    const name = path.split('/').at(-1).replace('sefgh_key_', '');
    const args = JSON.parse(options.body); calls.push({ name, role });
    if (['list', 'revoke'].includes(name)) assert.equal(inFlight, 0, 'cleanup overlapped an unsettled reservation');
    const owner = role === 'user-a' ? a : role === 'user-b' ? b : null;
    if (['issue', 'list', 'revoke'].includes(name) ? !owner : role !== 'accountant') return response({ code: '42501' }, 401);
    switch (name) {
      case 'policy': return response(ACCEPTANCE_POLICY);
      case 'list': return response({ items: [...keys.values()].filter(k => k.owner_id === owner).map(publicRow), next: null,
        ...(leakedListField ? { raw_key: 'private synthetic list leak' } : {}) });
      case 'issue': {
        if ([...keys.values()].filter(k => k.owner_id === owner && k.revoked_at === null).length >= 2) return error('SEFGH_KEY_ACTIVE_LIMIT');
        const id = Buffer.alloc(12, ++issued).toString('base64url');
        let secret = 'sk_sefgh_v1_' + id + '.' + Buffer.alloc(32, issued).toString('base64url');
        if (badSecret) secret = secret.slice(0, -1) + 'B';
        const row = { id, owner_id: owner, name: args.p_name, prefix: 'sk_sefgh_v1_' + id + '.', scopes: ['repo:read:public'],
          created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 600000).toISOString(), revoked_at: null,
          digest: createHash('sha256').update(secret).digest('hex') };
        keys.set(id, row);
        if (loseIssue) throw Error('private gateway diagnostic with user-a and raw synthetic key');
        return response({ key: publicRow(row), secret });
      }
      case 'revoke': {
        const row = keys.get(args.p_selector);
        if (row?.owner_id === owner && !blockCleanup) row.revoked_at = new Date().toISOString();
        return response(null);
      }
      case 'lookup': {
        const row = keys.get(args.p_selector); return response({ ...publicRow(row), verifier_hex: row.digest });
      }
      case 'reserve': {
        inFlight++;
        const owner = keys.get(args.p_selector)?.owner_id;
        current.set(owner, (current.get(owner) ?? 0) + 1);
        peaks.set(owner, Math.max(peaks.get(owner) ?? 0, current.get(owner)));
        if (observeConcurrency) await Promise.resolve();
        if (delayedReserve && args.p_request_id.endsWith('key-limit-3')) await new Promise(resolve => setTimeout(resolve, 20));
        inFlight--;
        current.set(owner, current.get(owner) - 1);
        const row = keys.get(args.p_selector);
        if (!row || row.digest !== args.p_verifier_hex || row.revoked_at !== null) return error('SEFGH_KEY_DENIED');
        if (events.has(args.p_request_id)) return error('SEFGH_KEY_REPLAY');
        const charged = [...events.values()].filter(e => !refundCompleted || !e.completed);
        if (charged.filter(e => e.r.Selector === row.id).length >= 2 || charged.filter(e => e.r.Owner === row.owner_id).length >= 3) return error('SEFGH_KEY_LIMIT');
        const r = { RequestID: args.p_request_id, Selector: row.id, Owner: row.owner_id, Endpoint: 'public-search', StartedAt: new Date().toISOString() };
        events.set(r.RequestID, { r, saved: null, completed: null });
        return response(badReservation ? { ...r, Owner: row.owner_id === a ? b : a } : r);
      }
      case 'pending': return response({ items: [...events.values()].filter(e => !e.completed).map(e => ({ Reservation: e.r, Receipt: e.saved })), next: null });
      case 'recovery': events.get(args.p_receipt.Reservation.RequestID).saved = args.p_receipt; return response(null);
      case 'complete': {
        const event = events.get(args.p_receipt.Reservation.RequestID);
        if (!ignoreSavedConflict && event.saved && JSON.stringify(event.saved) !== JSON.stringify(args.p_receipt)) return error('SEFGH_KEY_ACCOUNTING');
        if (event.completed && JSON.stringify(event.completed) !== JSON.stringify(args.p_receipt)) return error('SEFGH_KEY_ACCOUNTING');
        event.completed = args.p_receipt; event.saved = null; return response(null);
      }
      default: throw Error('Unexpected fixture operation');
    }
  }
  return { fetchImpl, keys, events, calls, peaks };
}

test('hosted acceptance orchestrates roles, quotas, receipts and confirmed scoped cleanup', async () => {
  const f = gateway(), result = await runHostedKeyAcceptance(config(), f);
  assert.equal(result.project_ref, DEV_PROJECT_REF); assert.equal(result.created_keys, 3);
  for (const name of ['owner-isolation', 'atomic-per-key-limit', 'atomic-per-owner-limit', 'idempotent-completion']) {
    assert.ok(result.checks.some(check => check.includes(name)), name);
  }
  assert.equal(f.keys.size, 3); assert.ok([...f.keys.values()].every(row => row.revoked_at));
  assert.equal(f.events.size, 5); assert.ok([...f.events.values()].every(row => row.completed));
  assert.doesNotMatch(JSON.stringify(result), /user-a|user-b|sb_publishable|sk_sefgh|verifier_hex|RequestID/);
});

test('wrong project, missing approval and privileged/configuration tokens fail before I/O', async () => {
  for (const edit of [{ projectRef: 'kohwfuxqbllsmvmsfqci' }, { allowDevKeyWrites: false }, { publicKey: 'sb_secret_private' },
    { accountant: 'sb_secret_private' }, { userA: '' }, { userA: 'line\nbreak' }, { accountant: 'user-a' }]) {
    let calls = 0;
    await assert.rejects(runHostedKeyAcceptance({ ...config(), ...edit }, { fetchImpl: () => { calls++; throw Error('must not reach network'); } }));
    assert.equal(calls, 0);
  }
});

test('two sessions for one owner cannot mutate keys', async () => {
  const f = gateway({ sameOwner: true });
  await assert.rejects(runHostedKeyAcceptance(config(), f), /distinct-owners/);
  assert.equal(f.keys.size, 0); assert.equal(f.calls.some(c => c.name === 'issue'), false);
});

test('ambiguous issuance is never repeated; metadata discovers and revokes only the new key', async () => {
  const f = gateway({ loseIssue: true });
  await assert.rejects(runHostedKeyAcceptance(config(), f), error => {
    assert.equal(error.cleanupRequired, false); assert.doesNotMatch(error.message, /private|user-a|synthetic key/); return true;
  });
  assert.equal(f.calls.filter(c => c.name === 'issue' && c.role === 'user-a').length, 1);
  assert.equal(f.keys.size, 1); assert.ok([...f.keys.values()][0].revoked_at);
});

test('mismatched reservation bindings are rejected and cleanup is confirmed', async () => {
  const f = gateway({ badReservation: true });
  await assert.rejects(runHostedKeyAcceptance(config(), f), /exact-reservation-binding/);
  assert.ok([...f.keys.values()].every(row => row.revoked_at));
});

test('all concurrent reservations settle before failure cleanup begins', async () => {
  const f = gateway({ badReservation: true, delayedReserve: true });
  await assert.rejects(runHostedKeyAcceptance(config(), f), error => {
    assert.equal(error.cleanupRequired, false); assert.equal(error.accountingReviewRequired, true); return true;
  });
  assert.ok([...f.keys.values()].every(row => row.revoked_at));
});

test('unconfirmed cleanup is reported rather than claiming a clean result', async () => {
  const f = gateway({ loseIssue: true, blockCleanup: true });
  await assert.rejects(runHostedKeyAcceptance(config(), f), error => error.cleanupRequired === true);
});

test('oversized or sensitive gateway failures never become report payloads', async () => {
  await assert.rejects(runHostedKeyAcceptance(config(), { fetchImpl: async () => new Response('x'.repeat(70000)) }), /reply-size/);
  await assert.rejects(runHostedKeyAcceptance(config(), { fetchImpl: async () => { throw Error('sensitive user-a credential'); } }), error => !error.message.includes('sensitive'));
});

test('CLI refuses live work without its explicit target/write flags', () => {
  const script = fileURLToPath(new URL('../keys-hosted-acceptance.mjs', import.meta.url));
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 5000, windowsHide: true });
  assert.equal(r.status, 1); assert.deepEqual(JSON.parse(r.stderr), { status: 'failed', step: 'command-gate', run_nonce: null, key_cleanup_required: false, accounting_review_required: false });
});

test('noncanonical issuance material and unknown list fields cannot count as acceptance', async () => {
  for (const options of [{ badSecret: true }, { leakedListField: true }]) {
    const f = gateway(options);
    await assert.rejects(runHostedKeyAcceptance(config(), f));
  }
});

test('unexpected successful void replies are rejected even when the operation took effect', async () => {
  const f = gateway();
  const fetchImpl = async (url, options) => {
    const r = await f.fetchImpl(url, options);
    if (r.ok && /sefgh_key_(revoke|recovery|complete)$/.test(new URL(url).pathname))
      return new Response(JSON.stringify({ unexpected: 'private synthetic payload' }));
    return r;
  };
  await assert.rejects(runHostedKeyAcceptance(config(), { fetchImpl }), error => {
    assert.doesNotMatch(error.message, /private synthetic/); return true;
  });
});

test('one owner cleanup failure cannot skip the other owner or known selectors', async () => {
  const f = gateway(); let cleanup = false;
  const fetchImpl = async (url, options) => {
    const path = new URL(url).pathname, role = options.headers.Authorization?.slice(7);
    if (role === 'accountant' && path.endsWith('sefgh_key_lookup')) { cleanup = true; return new Response('{}', { status: 500 }); }
    if (cleanup && role === 'user-a' && path.endsWith('sefgh_key_list')) return new Response('{}', { status: 403 });
    return f.fetchImpl(url, options);
  };
  await assert.rejects(runHostedKeyAcceptance(config(), { fetchImpl }), error => error.cleanupRequired === true);
  assert.ok([...f.keys.values()].filter(k => k.owner_id === b).every(k => k.revoked_at), 'B was skipped');
  assert.ok([...f.keys.values()].filter(k => k.owner_id === a).every(k => k.revoked_at), 'known A selectors were skipped after discovery failed');
});

test('a failed known-selector revoke cannot skip the next known key', async () => {
  const f = gateway(); let cleanup = false, denied;
  const fetchImpl = async (url, options) => {
    const path = new URL(url).pathname, role = options.headers.Authorization?.slice(7);
    if (role === 'accountant' && path.endsWith('sefgh_key_lookup')) { cleanup = true; return new Response('{}', { status: 500 }); }
    if (cleanup && role === 'user-a' && path.endsWith('sefgh_key_revoke')) {
      denied ??= [...f.keys.values()].find(k => k.owner_id === a).id;
      if (JSON.parse(options.body).p_selector === denied) return new Response('{}', { status: 403 });
    }
    return f.fetchImpl(url, options);
  };
  await assert.rejects(runHostedKeyAcceptance(config(), { fetchImpl }), error => error.cleanupRequired === true);
  assert.ok([...f.keys.values()].filter(k => k.id !== denied).every(k => k.revoked_at), 'remaining keys skipped');
});

test('owner and key quota checks actually overlap distinct admission calls', async () => {
  const f = gateway({ observeConcurrency: true });
  const result = await runHostedKeyAcceptance(config(), f);
  assert.ok(result.checks.includes('atomic-per-owner-limit'));
  assert.ok(f.peaks.get(a) >= 2 && f.peaks.get(b) >= 2);
});

test('saved pending conflicts and refunds after completion cannot pass acceptance', async () => {
  for (const options of [{ ignoreSavedConflict: true }, { refundCompleted: true }]) {
    await assert.rejects(runHostedKeyAcceptance(config(), gateway(options)), error => error.accountingReviewRequired === true);
  }
});

test('every accounting RPC is denied for user sessions, not just the policy sample', async () => {
  const f = gateway();
  const fetchImpl = (url, options) => options.headers.Authorization === 'Bearer user-a' && new URL(url).pathname.endsWith('sefgh_key_lookup')
    ? Promise.resolve(new Response('{}')) : f.fetchImpl(url, options);
  await assert.rejects(runHostedKeyAcceptance(config(), { fetchImpl }), /rpc-role-denial-lookup/);
  assert.equal(f.keys.size, 0);
});

test('a secret-free run nonce is emitted before any hosted request and retained on failure', async () => {
  let start;
  const result = await runHostedKeyAcceptance(config(), { ...gateway(), onStart: event => { start = event; } });
  assert.match(start.run_nonce, /^sefgh-acceptance-[a-f0-9-]+$/);
  assert.equal(result.run_nonce, start.run_nonce);
  await assert.rejects(runHostedKeyAcceptance(config(), { fetchImpl: async () => { assert.ok(start); throw Error('private'); },
    onStart: event => { start = event; } }), error => error.runNonce === start.run_nonce);
});

for (const field of ['reservation-start', 'saved-start', 'saved-finish']) {
  test(`pending discovery rejects a one-microsecond change to ${field}`, async () => {
    const f = gateway();
    const fetchImpl = async (url, options) => {
      const reply = await f.fetchImpl(url, options);
      if (!reply.ok || !new URL(url).pathname.endsWith('sefgh_key_pending')) return reply;
      const page = await reply.json();
      if (page.items.length) {
        const row = page.items.find(item => item.Receipt !== null);
        const change = value => value.replace(/\.(\d{3})Z$/, (_, milliseconds) => `.${milliseconds}001Z`);
        if (field === 'reservation-start') row.Reservation.StartedAt = change(row.Reservation.StartedAt);
        if (field === 'saved-start') row.Receipt.Reservation.StartedAt = change(row.Receipt.Reservation.StartedAt);
        if (field === 'saved-finish') row.Receipt.FinishedAt = change(row.Receipt.FinishedAt);
      }
      return new Response(JSON.stringify(page));
    };
    await assert.rejects(runHostedKeyAcceptance(config(), { fetchImpl }), error => {
      assert.match(error.message, /recovery-discovery/);
      assert.equal(error.accountingReviewRequired, true); return true;
    });
    assert.ok([...f.keys.values()].every(key => key.revoked_at));
  });
}

test('pending discovery accepts equivalent offsets and fractional-second spellings', async () => {
  const f = gateway();
  const equivalent = value => {
    const local = new Date(Date.parse(value) + 330 * 60000).toISOString().slice(0, 19);
    const fraction = /\.(\d+)Z$/.exec(value)[1];
    return local + '.' + fraction + '000+05:30';
  };
  const fetchImpl = async (url, options) => {
    const reply = await f.fetchImpl(url, options);
    if (!reply.ok || !new URL(url).pathname.endsWith('sefgh_key_pending')) return reply;
    const page = await reply.json();
    for (const row of page.items) {
      row.Reservation.StartedAt = equivalent(row.Reservation.StartedAt);
      if (row.Receipt) {
        row.Receipt.Reservation.StartedAt = equivalent(row.Receipt.Reservation.StartedAt);
        row.Receipt.FinishedAt = equivalent(row.Receipt.FinishedAt);
      }
    }
    return new Response(JSON.stringify(page));
  };
  const result = await runHostedKeyAcceptance(config(), { fetchImpl });
  assert.ok(result.checks.includes('exact-idempotent-completion'));
});
