// Runs the real handlers of a route that reads and writes the database.
// Their Supabase client is built by the real supabase-js around a stand-in
// for Supabase, so every query, write, function call, admin call and reading
// of a reply is supabase-js's own. Only auth.getUser() and auth.getSession()
// are replaced: getUser answers what the fixture's `user` says, as Supabase
// Auth would for the session, and getSession hands supabase-js the session's
// token, as the cookie client does. So the Data API gets the visitor's
// token, and the auth admin API gets the public key, as with the real
// server client.
// The clock is fixed, so `new Date()` gives the same moment every run.
// collect-fixture.mjs and share-fixture.mjs are earlier, narrower versions.
//
// A fixture gives:
//   method         GET, POST or DELETE
//   query          the request's query string, without "?"
//   body           the request body as text (POST, PATCH), sent as it is
//   session        the visitor's access token, or null when signed out. The
//                  cookie-session client sends it to the Data API; signed
//                  out, it sends the project's public key instead.
//   user           what getUser() answers for that session: an object, null
//                  (no session), or { "error": "..." }
//   client_throws  true when the project's settings are missing
//   params         the route's path parameters, as Next.js hands them to
//                  the handler (decoded): { "id": "c1" }. Each [name] in the
//                  route is written into the request's path, percent-encoded.
//   site_url       NEXT_PUBLIC_SITE_URL while the handler runs; left out or
//                  null, it is unset
//   database       the replies to the handler's requests, one per request
//                  in order: { "status": 201, "raw": "" },
//                  { "status": 200, "body": [...], "headers": {...} } or
//                  { "network_error": true }. A request beyond the list
//                  gets 200 with [].
//   routes         instead of database, for handlers that make requests at
//                  the same time, whose order is not part of the contract:
//                  [{ "match": "HEAD /rest/v1/repo_comments", ...reply }].
//                  A request gets the first reply whose match is part of
//                  "METHOD path?query"; one with no match gets 200 with [].
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
  const original = { error: console.error, client: globalThis.__routeClient, Date: globalThis.Date, siteURL: process.env.NEXT_PUBLIC_SITE_URL };
  const database = [];
  try {
    console.error = () => {};
    if (fixture.site_url == null) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = fixture.site_url;
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
      const asked = `${init.method ?? 'GET'} ${url.pathname}${url.search}`;
      const answer = (fixture.routes
        ? fixture.routes.find((route) => asked.includes(route.match))
        : (fixture.database ?? [])[database.length - 1]) ?? { status: 200, body: [] };
      if (answer.network_error) throw new TypeError('fetch failed');
      const status = answer.status ?? 200;
      // A 204 reply has no body at all; Response refuses even an empty one.
      // Neither does a reply to HEAD.
      const empty = status === 204 || (init.method ?? 'GET') === 'HEAD';
      const body = empty ? null : answer.raw ?? (answer.body === undefined ? '' : JSON.stringify(answer.body));
      return new Response(body, { status, headers: { 'content-type': 'application/json', ...answer.headers } });
    };
    globalThis.__routeClient = () => {
      if (fixture.client_throws) return createServerClient(undefined, undefined, { cookies: { getAll: () => [], setAll() {} } });
      const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { fetch },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      client.auth.getSession = async () => ({
        data: { session: fixture.session ? { access_token: fixture.session } : null },
        error: null,
      });
      client.auth.getUser = async () => {
        const user = fixture.user ?? null;
        if (user === null) return { data: { user: null }, error: { message: 'Auth session missing!' } };
        if (user.error) return { data: { user: null }, error: { message: user.error } };
        return { data: { user }, error: null };
      };
      return client;
    };
    const params = fixture.params ?? {};
    const path = route.replace(/\[(\w+)\]/g, (_, name) => encodeURIComponent(params[name]));
    const url = `https://app.test${path}${fixture.query ? `?${fixture.query}` : ''}`;
    const hasBody = fixture.method === 'POST' || fixture.method === 'PATCH';
    const request = new Request(url, { method: fixture.method, body: hasBody ? fixture.body ?? '' : undefined });
    const response = await handlers[fixture.method](request, { params: Promise.resolve(params) });
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
    if (original.siteURL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original.siteURL;
    delete globalThis.__routeClient;
    if (original.client !== undefined) globalThis.__routeClient = original.client;
  }
}
