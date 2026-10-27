// The browser Supabase client's fetch (DATA-PROXY-001). A Data API request
// for a table or function whose area is switched on in
// NEXT_PUBLIC_SEFGH_GO_DATA goes to this site's /api/data/{area}/rest/v1/...,
// which the Go data proxy checks and forwards with the same token. Every
// other request, Auth, Storage and Realtime included, goes to Supabase as
// before.
//
// If that path is not served by Go (a 404 without the Go server's
// X-Sefgh-Backend mark, as when the rewrite is missing), the request is sent
// to Supabase directly, so a half-set switch never breaks an area. Go's own
// answers, refusals included, are passed back as they are.
//
// A client on the server has no same-origin rewrite to go through, so
// serverRoutedFetch sends the same requests to the Go server itself
// (DATA-010).
import { proxyArea, usesGo } from '@/lib/go-areas.mjs';

/**
 * @param {string} supabaseUrl the project's address
 * @param {typeof fetch} [fetchImpl] the fetch to send with; the global one by default
 * @param {string} [setting] NEXT_PUBLIC_SEFGH_GO_DATA, for tests
 * @param {string} [base] where /api/data is: this site (the default) or the Go server
 */
export function routedFetch(supabaseUrl, fetchImpl = (...args) => globalThis.fetch(...args), setting, base = '') {
  const dataAPI = `${String(supabaseUrl).replace(/\/+$/, '')}/rest/v1/`;
  return async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    if (typeof href !== 'string' || !href.startsWith(dataAPI)) return fetchImpl(input, init);
    const rest = href.slice(dataAPI.length);
    const path = rest.split('?')[0];
    const target = path.startsWith('rpc/') ? path.split('/').slice(0, 2).join('/') : path.split('/')[0];
    const area = proxyArea(decodeURIComponent(target));
    const on = setting === undefined ? usesGo(area ?? '') : usesGo(area ?? '', setting);
    if (!area || !on) return fetchImpl(input, init);
    const response = await fetchImpl(`${base}/api/data/${area}/rest/v1/${rest}`, init);
    if (response.status === 404 && response.headers.get('x-sefgh-backend') !== 'go') return fetchImpl(input, init);
    return response;
  };
}

/**
 * The same routing for a Supabase client on the server. Switched areas go
 * to SEFGH_GO_API_URL, the destination next.config.mjs rewrites them to;
 * without it nothing is routed, as nothing is rewritten.
 *
 * @param {string} supabaseUrl the project's address
 * @param {string} [goOrigin] SEFGH_GO_API_URL
 * @param {typeof fetch} [fetchImpl] the fetch to send with; the global one by default
 * @param {string} [setting] NEXT_PUBLIC_SEFGH_GO_DATA, for tests
 * @returns {typeof fetch | undefined} undefined when there is no Go server to send to
 */
export function serverRoutedFetch(supabaseUrl, goOrigin = process.env.SEFGH_GO_API_URL, fetchImpl, setting) {
  const origin = String(goOrigin ?? '').replace(/\/+$/, '');
  return origin ? routedFetch(supabaseUrl, fetchImpl, setting, origin) : undefined;
}
