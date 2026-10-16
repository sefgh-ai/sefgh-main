// Runs the real GET /api/share/[token] handler. Its Supabase client is built
// by the real supabase-js around a stand-in for the Data API, so the query
// it sends and the way it reads the reply are supabase-js's own. Every
// request the client makes is recorded. Nothing real is contacted.
//
// A fixture gives:
//   token          the route's [token], as Next.js hands it to the handler
//   session        the visitor's access token, or null when signed out. The
//                  cookie-session client sends it; signed out, it sends the
//                  project's public key instead.
//   client_throws  true when the project's settings are missing: the real
//                  createServerClient of @supabase/ssr then throws.
//   database       what the Data API answers: { "status": 406, "body": {...} }
//                  with a JSON body, { "status": 200, "raw": "text" }, or
//                  { "network_error": true }. Status 200 is the default.
//
// A request is recorded as the path and query it was sent to, with its
// Accept, Authorization and apikey headers.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

export const SUPABASE_URL = 'https://contract-supabase.invalid';
export const SUPABASE_KEY = 'public-fixture-key';

export async function runShareFixture(GET, fixture) {
  const original = { error: console.error, client: globalThis.__shareClient };
  const database = [];
  try {
    console.error = () => {};
    const fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      const headers = new Headers(init.headers);
      database.push({
        path: url.pathname + url.search,
        accept: headers.get('accept'),
        authorization: headers.get('authorization'),
        apikey: headers.get('apikey'),
      });
      const answer = fixture.database ?? {};
      if (answer.network_error) throw new TypeError('fetch failed');
      const body = answer.raw ?? (answer.body === undefined ? '' : JSON.stringify(answer.body));
      return new Response(body, { status: answer.status ?? 200, headers: { 'content-type': 'application/json' } });
    };
    globalThis.__shareClient = fixture.client_throws
      ? () => createServerClient(undefined, undefined, { cookies: { getAll: () => [], setAll() {} } })
      : () => createClient(SUPABASE_URL, SUPABASE_KEY, { accessToken: async () => fixture.session ?? null, global: { fetch } });
    const request = new Request(`https://app.test/api/share/${encodeURIComponent(fixture.token)}`);
    const response = await GET(request, { params: Promise.resolve({ token: fixture.token }) });
    return {
      status: response.status,
      body: await response.json(),
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      database,
    };
  } finally {
    console.error = original.error;
    delete globalThis.__shareClient;
    if (original.client !== undefined) globalThis.__shareClient = original.client;
  }
}
