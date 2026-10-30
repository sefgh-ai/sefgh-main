// Real Next handler + installed Supabase SDK; only session, clock and HTTP
// are controlled. Drain the route's cleanup before restoring those globals.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { createHash } from 'node:crypto';
import { setImmediate } from 'node:timers/promises';
export const URL = 'https://contract-supabase.invalid';
export const KEY = 'public-fixture-key';
export const NOW = 1792229400000;
export const USER = '0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b';

export function avatarBody(f) {
  if (f.raw_body !== undefined) return { body: f.raw_body, headers: { 'content-type': f.content_type ?? 'application/json' } };
  const body = new FormData();
  for (const entry of f.fields ?? (f.file ? [{ name: 'avatar', file: f.file }] : [])) {
    if (entry.file) {
      const v = entry.file;
      const bytes = Buffer.alloc(v.size ?? 3, v.byte ?? 65);
      if (v.prefix_base64) Buffer.from(v.prefix_base64, 'base64').copy(bytes);
      body.append(entry.name, new Blob([bytes], { type: v.type ?? 'image/png' }), v.name ?? 'photo.png');
    } else body.append(entry.name, entry.value ?? '');
  }
  return { body };
}

export async function runAvatarFixture(handlers, f) {
  const original = { Date, client: globalThis.__routeClient, error: console.error, log: console.log, warn: console.warn };
  const calls = [];
  try {
    console.error = console.log = console.warn = () => {};
    globalThis.Date = class extends original.Date {
      constructor(...args) { super(...(args.length ? args : [NOW])); }
      static now() { return NOW; }
    };
    const fetch = async (input, init = {}) => {
      const target = new globalThis.URL(String(input));
      if (target.origin !== URL) throw new Error('fixture attempted external HTTP');
      const h = new Headers(init.headers);
      let body = null;
      if (init.body !== undefined) {
        body = typeof init.body === 'string' ? JSON.parse(init.body) : {
          bytes: init.body.byteLength,
          sha256: createHash('sha256').update(init.body).digest('hex'),
        };
      }
      calls.push({ method: init.method ?? 'GET', path: target.pathname + target.search,
        authorization: h.get('authorization'), apikey: h.get('apikey'),
        content_type: h.get('content-type'), cache_control: h.get('cache-control'),
        x_upsert: h.get('x-upsert'), body });
      const answer = f.database?.[calls.length - 1] ?? { status: 200, body: [] };
      if (answer.network_error) throw new TypeError('fetch failed');
      return new Response(answer.status === 204 ? null : answer.raw ?? JSON.stringify(answer.body === undefined ? {} : answer.body),
        { status: answer.status ?? 200, headers: { 'content-type': 'application/json', ...answer.headers } });
    };
    globalThis.__routeClient = () => {
      if (f.client_throws) return createServerClient(undefined, undefined, { cookies: { getAll: () => [], setAll() {} } });
      const client = createClient(URL, KEY, { global: { fetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const session = f.session ? { access_token: f.session, refresh_token: 'fixture-refresh', user: f.user } : null;
      client.auth.getSession = async () => ({ data: { session }, error: null });
      client.auth.getUser = async () => ({ data: { user: f.user ?? null }, error: f.auth_error ? { message: 'refused' } : null });
      // Keep updateUser's real HTTP, parsing and error behavior, replacing only
      // the SDK's internal session reader (there are no real SSR cookies).
      client.auth._useSession = async (fn) => fn({ data: { session }, error: null });
      return client;
    };
    const response = await handlers.POST(new Request('https://app.test/api/upload-avatar', { method: 'POST', ...avatarBody(f) }));
    // Cleanup has at most a list and a remove, each using promise chains only.
    for (let i = 0; i < 8; i++) await setImmediate();
    return { status: response.status, body: await response.json(), content_type: response.headers.get('content-type'), cache_control: response.headers.get('cache-control'), database: calls };
  } finally {
    globalThis.Date = original.Date;
    console.error = original.error; console.log = original.log; console.warn = original.warn;
    if (original.client === undefined) delete globalThis.__routeClient; else globalThis.__routeClient = original.client;
  }
}
