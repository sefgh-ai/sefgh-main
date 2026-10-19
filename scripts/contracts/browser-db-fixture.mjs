// Runs the real functions of a browser data module, such as
// src/lib/supabase/search-history.js, with the browser's Supabase client
// built by the real supabase-js around a stand-in Supabase. It records what
// each call returns and every Data API request it makes. This is how an area
// of browser database calls is characterized before it moves behind Go
// (docs/plans/browser-data.md).
//
// Browser modules build their client once, when they are loaded, so
// installBrowserClient() must run before the module is imported; each
// fixture then changes only the session and the stand-in's replies.
//
// A fixture gives:
//   call      the module's exported function
//   args      its arguments, as JSON
//   session   the signed-in user's access token, or null when signed out;
//             the browser client then sends the project's public key
//   database  the replies to the requests, in order: { "status": 201,
//             "body": {...} }, { "status": 204, "raw": "" } or
//             { "network_error": true }. A request beyond the list gets 200
//             with [].
//
// The result is { returns, database }, or { throws, database } when the call
// rejects. Requests are recorded as in route-db-fixture.mjs.
import { createClient } from '@supabase/supabase-js';
import { PostgrestClient } from '@supabase/postgrest-js';

/**
 * What supabase-js 2.78 gives for one Data API reply to a one-row call
 * (.single()): { data, error }, worked out by the real postgrest-js. Areas
 * whose Go endpoints answer that result use it as the answer Go must give.
 * Without a reply, supabase-js puts the error's stack in `details`; that is
 * written as "" here.
 */
export async function postgrestResult(reply) {
  const fetch = async () => {
    if (reply.network_error) throw new TypeError('fetch failed');
    const status = reply.status ?? 200;
    const body = status === 204 ? null : reply.raw ?? (reply.body === undefined ? '' : JSON.stringify(reply.body));
    return new Response(body, { status, headers: { 'content-type': 'application/json' } });
  };
  const { data, error } = await new PostgrestClient('https://contract-supabase.invalid/rest/v1', { fetch }).from('t').select('*').single();
  if (error && reply.network_error) error.details = '';
  return JSON.parse(JSON.stringify({ data, error }));
}

export const SUPABASE_URL = 'https://contract-supabase.invalid';
export const SUPABASE_KEY = 'public-fixture-key';
// The moment `new Date()` returns while a call runs.
export const NOW = '2026-10-19T09:30:00.000Z';

let current = null;
let requests = [];

export function installBrowserClient() {
  const fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const headers = new Headers(init.headers);
    requests.push({
      method: init.method ?? 'GET',
      path: url.pathname + url.search,
      prefer: headers.get('prefer'),
      accept: headers.get('accept'),
      content_type: headers.get('content-type'),
      authorization: headers.get('authorization'),
      apikey: headers.get('apikey'),
      body: init.body === undefined ? null : JSON.parse(init.body),
    });
    const answer = (current?.database ?? [])[requests.length - 1] ?? { status: 200, body: [] };
    if (answer.network_error) throw new TypeError('fetch failed');
    const status = answer.status ?? 200;
    const body = status === 204 ? null : answer.raw ?? (answer.body === undefined ? '' : JSON.stringify(answer.body));
    return new Response(body, { status, headers: { 'content-type': 'application/json' } });
  };
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  // The browser client sends the stored session's token; here, the fixture's.
  client.auth.getSession = async () => ({
    data: { session: current?.session ? { access_token: current.session } : null },
    error: null,
  });
  globalThis.__browserClient = () => client;
}

/**
 * Runs a call with the module's area switched to Go
 * (NEXT_PUBLIC_SEFGH_GO_DATA). Requests to this site's /api go to a stand-in
 * Go server that answers `goAnswer` ({ status, body }), or, given a list,
 * the list's answers in order; the result also lists the requests, as `go`.
 * Direct Data API requests, made when Go is not there (404), are recorded
 * as usual.
 */
export async function runSwitchedFixture(module, fixture, area, goAnswer) {
  const saved = { fetch: globalThis.fetch, setting: process.env.NEXT_PUBLIC_SEFGH_GO_DATA };
  const go = [];
  process.env.NEXT_PUBLIC_SEFGH_GO_DATA = area;
  globalThis.fetch = async (input, init = {}) => {
    const headers = new Headers(init.headers);
    go.push({
      method: init.method ?? 'GET',
      path: String(input),
      authorization: headers.get('authorization'),
      content_type: headers.get('content-type'),
      body: init.body === undefined ? null : JSON.parse(init.body),
    });
    const answer = Array.isArray(goAnswer) ? goAnswer[go.length - 1] ?? goAnswer.at(-1) : goAnswer;
    const body = answer.status === 204 ? null : JSON.stringify(answer.body ?? null);
    return new Response(body, { status: answer.status, headers: { 'content-type': 'application/json' } });
  };
  try {
    return { ...(await runBrowserFixture(module, fixture)), go };
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.setting === undefined) delete process.env.NEXT_PUBLIC_SEFGH_GO_DATA;
    else process.env.NEXT_PUBLIC_SEFGH_GO_DATA = saved.setting;
  }
}

export async function runBrowserFixture(module, fixture) {
  const quiet = { error: console.error, log: console.log, Date: globalThis.Date };
  current = fixture;
  requests = [];
  try {
    console.error = () => {};
    console.log = () => {};
    const RealDate = quiet.Date;
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
    let result;
    try {
      result = { returns: await module[fixture.call](...(fixture.args ?? [])) };
    } catch (error) {
      result = { throws: `${error?.name}: ${error?.message}` };
    }
    // A request started without being awaited would still arrive by now.
    for (let i = 0; i < 3; i++) await new Promise((resolve) => setImmediate(resolve));
    return { ...result, database: requests };
  } finally {
    console.error = quiet.error;
    console.log = quiet.log;
    globalThis.Date = quiet.Date;
    current = null;
  }
}
