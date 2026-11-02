// The Supabase clients' fetch (DATA-PROXY-001). A Data API request for a
// table or function in one of the Go data proxy's areas goes to
// /api/data/{area}/rest/v1/..., which the Go data proxy checks and forwards
// with the same token. Every other request, Auth, Storage and Realtime
// included, goes to Supabase as before.
//
// Since P7-08b there is no switch and no direct path: Go's answer, a refusal
// or an error included, is the answer. In the browser, next.config.mjs
// rewrites /api/data to the Go server; on the server there is no same-origin
// rewrite, so serverRoutedFetch sends the same requests to the Go server
// itself (DATA-010).
import { proxyArea } from '@/lib/go-areas.mjs';

/**
 * @param {string} supabaseUrl the project's address
 * @param {typeof fetch} [fetchImpl] the fetch to send with; the global one by default
 * @param {string} [base] where /api/data is: this site (the default) or the Go server
 */
export function routedFetch(supabaseUrl, fetchImpl = (...args) => globalThis.fetch(...args), base = '') {
  const dataAPI = `${String(supabaseUrl).replace(/\/+$/, '')}/rest/v1/`;
  return async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    if (typeof href !== 'string' || !href.startsWith(dataAPI)) return fetchImpl(input, init);
    const rest = href.slice(dataAPI.length);
    const path = rest.split('?')[0];
    const target = path.startsWith('rpc/') ? path.split('/').slice(0, 2).join('/') : path.split('/')[0];
    const area = proxyArea(decodeURIComponent(target));
    if (!area) return fetchImpl(input, init);
    return fetchImpl(`${base}/api/data/${area}/rest/v1/${rest}`, init);
  };
}

// What a proxied request gets on the server when SEFGH_GO_API_URL is not
// set: a Data API-shaped failure, so supabase-js reports an error. It is
// never sent to Supabase directly.
const notConfigured = () => new Response(
  JSON.stringify({ code: 'SEFGH503', message: 'The Go data server is not configured', details: null, hint: null }),
  { status: 503, headers: { 'content-type': 'application/json' } },
);

/**
 * The same routing for a Supabase client on the server: proxied requests go
 * to SEFGH_GO_API_URL, the destination next.config.mjs rewrites them to.
 *
 * @param {string} supabaseUrl the project's address
 * @param {string} [goOrigin] SEFGH_GO_API_URL
 * @param {typeof fetch} [fetchImpl] the fetch to send with; the global one by default
 */
export function serverRoutedFetch(supabaseUrl, goOrigin = process.env.SEFGH_GO_API_URL, fetchImpl = (...args) => globalThis.fetch(...args)) {
  const origin = String(goOrigin ?? '').replace(/\/+$/, '');
  return routedFetch(supabaseUrl, origin ? fetchImpl : (input, init) => (
    String(input).startsWith('/api/data/') ? notConfigured() : fetchImpl(input, init)
  ), origin);
}
