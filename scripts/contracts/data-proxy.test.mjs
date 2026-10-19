// The Go data proxy's browser half (DATA-PROXY-001): which requests the
// browser's Supabase client sends through /api/data, and whether the
// proxy's rules (backend/internal/dataproxy/policy.json) allow every
// database write the code makes. The Go half is tested in the dataproxy
// package; together they forward each request unchanged.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { PROXY_AREAS, proxyArea } = await import('../../src/lib/go-areas.mjs');
const { routedFetch } = await import('../../src/lib/supabase/data-routing.js');

const root = new URL('../../', import.meta.url);
const policy = JSON.parse(await readFile(new URL('backend/internal/dataproxy/policy.json', root), 'utf8'));
const SUPABASE = 'https://project.supabase.co';

test('the browser routes exactly the tables the Go policy serves', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PROXY_AREAS).map(([area, targets]) => [area, [...targets].sort()])),
    Object.fromEntries(Object.entries(policy).map(([area, rules]) => [area, Object.keys(rules).sort()])),
  );
  const all = Object.values(PROXY_AREAS).flat();
  assert.equal(new Set(all).size, all.length, 'a table belongs to one area');
  // Search history and onboarding have endpoints of their own.
  for (const own of ['search_history', 'onboarding_data']) assert.equal(proxyArea(own), null);
});

test('only switched-on areas go through Go, with the request unchanged', async () => {
  const sent = [];
  const answer = (status, mark) => new Response('[]', { status, headers: mark ? { 'x-sefgh-backend': 'go' } : {} });
  let next = () => answer(200, true);
  const fetchImpl = async (input, init) => { sent.push([String(input), init]); return next(); };
  const route = routedFetch(`${SUPABASE}/`, fetchImpl, 'home, conversations ,activity');
  const init = { method: 'PATCH', headers: { Authorization: 'Bearer t' }, body: '{"title":"x"}' };

  await route(`${SUPABASE}/rest/v1/user_conversations?id=eq.c1&select=*`, init);
  await route(`${SUPABASE}/rest/v1/rpc/log_user_activity`, init);
  await route(`${SUPABASE}/rest/v1/notifications?select=*`, init); // area off
  await route(`${SUPABASE}/rest/v1/search_history?select=*`, init); // its own endpoint
  await route(`${SUPABASE}/auth/v1/user`, init); // not the Data API
  await route(`${SUPABASE}/storage/v1/object/avatars/a.png`, init);
  assert.deepEqual(sent.map(([url]) => url), [
    '/api/data/conversations/rest/v1/user_conversations?id=eq.c1&select=*',
    '/api/data/activity/rest/v1/rpc/log_user_activity',
    `${SUPABASE}/rest/v1/notifications?select=*`,
    `${SUPABASE}/rest/v1/search_history?select=*`,
    `${SUPABASE}/auth/v1/user`,
    `${SUPABASE}/storage/v1/object/avatars/a.png`,
  ]);
  assert.ok(sent.every(([, given]) => given === init), 'method, headers and body are passed on as they are');

  // A 404 that Go did not send means the rewrite is missing: Supabase directly.
  sent.length = 0;
  let calls = 0;
  next = () => (calls++ === 0 ? answer(404, false) : answer(200, false));
  const direct = await route(`${SUPABASE}/rest/v1/projects?select=*`, init);
  assert.equal(direct.status, 200);
  assert.deepEqual(sent.map(([url]) => url), ['/api/data/home/rest/v1/projects?select=*', `${SUPABASE}/rest/v1/projects?select=*`]);

  // Go's own 404 or refusal is the answer: no going round the rules.
  for (const [status, mark] of [[404, true], [403, true]]) {
    sent.length = 0;
    next = () => answer(status, mark);
    assert.equal((await route(`${SUPABASE}/rest/v1/projects?select=*`, init)).status, status);
    assert.equal(sent.length, 1);
  }
});

// The real supabase-js client with the routing fetch, as client.js builds it:
// with the setting off nothing changes; on, the same request goes to Go.
test('supabase-js sends its requests through the routing fetch unchanged', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  for (const [setting, url] of [['', `${SUPABASE}/rest/v1/notifications?select=*&user_id=eq.u1`], ['notifications', '/api/data/notifications/rest/v1/notifications?select=*&user_id=eq.u1']]) {
    const sent = [];
    const fetchImpl = async (input, init) => {
      sent.push({ url: String(input), headers: new Headers(init?.headers) });
      return new Response('[{"id":"n1"}]', { status: 200, headers: { 'content-type': 'application/json', 'x-sefgh-backend': 'go' } });
    };
    const client = createClient(SUPABASE, 'public-key', { global: { fetch: routedFetch(SUPABASE, fetchImpl, setting) }, auth: { persistSession: false } });
    client.auth.getSession = async () => ({ data: { session: { access_token: 'user-token' } }, error: null });
    const { data, error } = await client.from('notifications').select('*').eq('user_id', 'u1');
    assert.equal(error, null);
    assert.deepEqual(data, [{ id: 'n1' }]);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, url);
    assert.equal(sent[0].headers.get('authorization'), 'Bearer user-token');
    assert.equal(sent[0].headers.get('apikey'), 'public-key');
  }
});

// Every database write the browser code makes on a proxied table, by file.
// When code adds one, this list and, after review, policy.json change with it.
const WRITES = [
  ['src/lib/notifications.js', 'notifications', 'insert', ['user_id', 'title', 'message', 'type', 'link']],
  ['src/lib/notifications.js', 'notifications', 'update', ['is_read']],
  ['src/lib/notifications.js', 'notifications', 'update', ['is_read']],
  ['src/lib/notifications.js', 'notifications', 'delete', []],
  ['src/contexts/NotificationContext.js', 'notifications', 'update', ['is_read']],
  ['src/contexts/NotificationContext.js', 'notifications', 'update', ['is_read']],
  ['src/contexts/NotificationContext.js', 'notifications', 'delete', []],
  ['src/contexts/NotificationContext.js', 'notifications', 'delete', []],
  ['src/hooks/notifications/useNotifications.js', 'notifications', 'update', ['is_read']],
  ['src/hooks/notifications/useNotifications.js', 'notifications', 'delete', []],
  ['src/hooks/useSendNotification.js', 'notifications', 'insert', ['user_id', 'title', 'message', 'type', 'link']],
  ['src/hooks/profile/useProfileData.js', 'profiles', 'update', ['bio', 'website']],
  ['src/lib/supabase/profiles.js', 'profiles', 'update', ['(generic, no caller)']],
  ['src/hooks/useUserStats.js', 'user_stats', 'insert', ['user_id']],
  ['src/hooks/useUserStats.js', 'user_stats', 'update', ['(generic, no caller)']],
  ['src/hooks/home/useCategories.js', 'categories', 'insert', ['name', 'icon', 'type', 'description', 'usage_count', 'is_active']],
  ['src/hooks/home/useCategories.js', 'categories', 'update', ['(generic, no caller)']],
  ['src/hooks/home/useCategories.js', 'categories', 'update', ['is_active']],
  ['src/hooks/submissions/useSubmissions.js', 'repo_submissions', 'delete', []],
  ['src/components/SubmitProjectDialog.jsx', 'repo_submissions', 'insert', ['user_id', 'url', 'title', 'description', 'tags']],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'insert', ['user_id', 'title', 'messages', 'model']],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'delete', []],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'update', ['messages']],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'update', ['title']],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'update', ['is_pinned']],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'update', ['status']],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'delete', []],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'update', ['messages']],
  ['src/lib/supabase/conversations.js', 'user_conversations', 'update', ['messages']],
];
const METHOD = { insert: 'POST', update: 'PATCH', delete: 'DELETE', upsert: 'POST' };

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(new URL(dir, root), { withFileTypes: true })) {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) { if (path !== 'src/app/api') out.push(...(await sourceFiles(`${path}/`))); }
    // Route handlers run on the server with the server client, which is not routed.
    else if (/\.(js|jsx|mjs)$/.test(entry.name) && entry.name !== 'route.js') out.push(path);
  }
  return out;
}

test('every write the code makes on a proxied table is allowed by the policy', async () => {
  const rules = Object.fromEntries(Object.values(policy).flatMap((area) => Object.entries(area)));
  const found = [];
  for (const file of await sourceFiles('src/')) {
    const text = await readFile(new URL(file, root), 'utf8');
    for (const chunk of text.split(/\.from\(/).slice(1)) {
      const table = chunk.match(/^\s*['"]([a-z_]+)['"]\s*\)/)?.[1];
      if (!table || !rules[table]) continue;
      const op = chunk.match(/^[^;]*?\.(insert|update|upsert|delete|select)\(/s)?.[1];
      if (op && op !== 'select') found.push(`${file} ${table} ${op}`);
    }
  }
  assert.deepEqual(found.sort(), WRITES.map(([file, table, op]) => `${file} ${table} ${op}`).sort(),
    'a database write was added or removed: review backend/internal/dataproxy/policy.json and this list');
  for (const [file, table, op, fields] of WRITES) {
    if (fields[0] === '(generic, no caller)') continue; // a function nothing calls
    assert.ok(rules[table].methods.includes(METHOD[op]), `${file}: ${op} on ${table}`);
    for (const field of fields.filter((f) => !f.startsWith('('))) {
      assert.ok(rules[table].writable.includes(field), `${file}: ${table}.${field}`);
    }
  }
  // Through Go nobody can set their own stats: updateStats has no caller,
  // and the policy refuses the update it would send (R-103).
  assert.ok(!rules.user_stats.methods.includes('PATCH'));
  // The activity logger's one function call.
  const logger = await readFile(new URL('src/lib/activity-logger.js', root), 'utf8');
  const args = [...logger.match(/rpc\('log_user_activity',\s*\{([^}]*)\}/)[1].matchAll(/(p_[a-z_]+):/g)].map((m) => m[1]);
  assert.deepEqual(args.filter((a) => !rules['rpc/log_user_activity'].writable.includes(a)), []);
});
