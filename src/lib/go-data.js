// Which areas of the browser's own database calls go through Go, and how a
// browser module asks Go (docs/plans/browser-data.md; the owner's choice of
// 2026-10-19). NEXT_PUBLIC_SEFGH_GO_DATA lists the areas, comma-separated.
// Next.js fixes it at build time, so a change needs a redeploy. The same
// setting adds the area's rewrite to the Go server (next.config.mjs).
import { fetchWithSession } from '@/lib/supabase/session-fetch';
import { usesGo } from '@/lib/go-areas.mjs';

export { usesGo };

/** Go has no route there (404): the module should use its direct path. */
export const NOT_SERVED = Symbol('not served by Go');

/**
 * Asks an area's Go endpoint as the signed-in user and answers its JSON
 * value. A 404 means the route is not there (the rewrite is missing), so the
 * answer is NOT_SERVED and nothing was changed. Any other failure (refused,
 * an error, no reply, a reply that is not JSON) answers `fallback`, the value
 * the module gives when its own database call fails.
 */
export async function askGo(path, init, fallback) {
  try {
    const response = await fetchWithSession(path, init);
    if (response.status === 404) return NOT_SERVED;
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

/**
 * Asks an area's Go endpoint for one database call's result, in the shape
 * supabase-js gives it: { data, error }. Areas whose module decides by the
 * error's code use this, so everything after the call stays as it was.
 * NOT_SERVED on a 404, as for askGo. Without a reply, the error is the one
 * supabase-js gives when the database cannot be reached.
 */
export async function goResult(path, init) {
  let response;
  try {
    response = await fetchWithSession(path, init);
  } catch (error) {
    return { data: null, error: { message: `${error?.name ?? 'FetchError'}: ${error?.message}`, details: '', hint: '', code: '' } };
  }
  if (response.status === 404) return NOT_SERVED;
  try {
    const answer = await response.json();
    if (answer && typeof answer === 'object' && 'error' in answer) return { data: answer.data ?? null, error: answer.error };
  } catch {
    // Not the expected answer; reported below.
  }
  return { data: null, error: { message: `Go answered ${response.status}`, details: null, hint: null, code: `${response.status}` } };
}

/**
 * One database call's result: from Go when the area is switched on and Go
 * serves it, and otherwise from `direct`, the supabase-js call itself.
 */
export async function resultFrom(area, path, init, direct) {
  if (usesGo(area)) {
    const result = await goResult(path, init);
    if (result !== NOT_SERVED) return result;
  }
  return direct();
}
