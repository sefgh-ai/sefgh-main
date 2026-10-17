// Runs the real handlers of a route that reads and writes the database.
// Their Supabase client is built by the real supabase-js around a stand-in
// for the Data API, so every query, write, function call and reading of a
// reply is supabase-js's own. Only auth.getUser() is replaced: it answers
// what the fixture's `user` says, as Supabase Auth would for the session.
// The clock is fixed, so `new Date()` gives the same moment every run.
// collect-fixture.mjs and share-fixture.mjs are earlier, narrower versions.
//
// A fixture gives:
//   method         GET, POST or DELETE
//   query          the request's query string, without "?"
//   body           the POST body as text, sent as it is
//   session        the visitor's access token, or null when signed out. The
//                  cookie-session client sends it to the Data API; signed
//                  out, it sends the project's public key instead.
//   user           what getUser() answers for that session: an object, null
//                  (no session), or { "error": "..." }
//   client_throws  true when the project's settings are missing
//   database       the Data API's replies, one per request in order:
//                  { "status": 201, "raw": "" }, { "status": 200, "body": [...] }
//                  or { "network_error": true }. A request beyond the list
//                  gets 200 with [].
//
// A request is recorded with its method, path and query, Prefer, Accept and
// Content-Type headers, Authorization and apikey, and its body as JSON.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

export const SUPABASE_URL = 'https://contract-supabase.invalid';
export const SUPABASE_KEY = 'public-fixture-key';
// The moment `new Date()` returns while a handler runs.
export const NOW = '2026-10-17T09:30:00.000Z';

export async function runRouteFixture(handlers, route, fixture) {
  const original = { error: console.error, client: globalThis.__routeClient, Date: globalThis.Date };
  const database = [];
  try {
    console.error = () => {};
    const RealDate = original.Date;
    const fixed = RealDate.parse(NOW);
    globalThis.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) super(fixed);
        else super(...args);
      }
      static now() {
        return fixed;
      }
    };
    const fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      const headers = new Headers(init.headers);
      database.push({
        method: init.method ?? 'GET',
        path: url.pathname + url.search,
        prefer: headers.get('prefer'),
        accept: headers.get('accept'),
        content_type: headers.get('content-type'),
        authorization: headers.get('authorization'),
        apikey: headers.get('apikey'),
        body: init.body === undefined ? null : JSON.parse(init.body),
      });
      const answer = (fixture.database ?? [])[database.length - 1] ?? { status: 200, body: [] };
      if (answer.network_error) throw new TypeError('fetch failed');
      const status = answer.status ?? 200;
      // A 204 reply has no body at all; Response refuses even an empty one.
      const body = status === 204 ? null : answer.raw ?? (answer.body === undefined ? '' : JSON.stringify(answer.body));
      return new Response(body, { status, headers: { 'content-type': 'application/json' } });
    };
    globalThis.__routeClient = () => {
      if (fixture.client_throws) return createServerClient(undefined, undefined, { cookies: { getAll: () => [], setAll() {} } });
      const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { fetch, headers: fixture.session ? { Authorization: `Bearer ${fixture.session}` } : {} },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      client.auth.getUser = async () => {
        const user = fixture.user ?? null;
        if (user === null) return { data: { user: null }, error: { message: 'Auth session missing!' } };
        if (user.error) return { data: { user: null }, error: { message: user.error } };
        return { data: { user }, error: null };
      };
      return client;
    };
    const url = `https://app.test${route}${fixture.query ? `?${fixture.query}` : ''}`;
    const request = new Request(url, { method: fixture.method, body: fixture.method === 'POST' ? fixture.body ?? '' : undefined });
    const response = await handlers[fixture.method](request);
    return {
      status: response.status,
      body: await response.json(),
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      database,
    };
  } finally {
    console.error = original.error;
    globalThis.Date = original.Date;
    delete globalThis.__routeClient;
    if (original.client !== undefined) globalThis.__routeClient = original.client;
  }
}
