// How a browser module asks Go for its own data (docs/plans/browser-data.md;
// the owner's choice of 2026-10-19). Since P7-08a, search history and
// onboarding always ask Go: there is no direct database path to fall back
// on, and next.config.mjs always rewrites their routes to the Go server.
import { fetchWithSession } from '@/lib/supabase/session-fetch';

/**
 * Asks a Go endpoint as the signed-in user and answers its JSON value. Any
 * failure (refused, missing, an error, no reply, a reply that is not JSON)
 * answers `fallback`, the value the module gives when its call fails.
 */
export async function askGo(path, init, fallback) {
  try {
    const response = await fetchWithSession(path, init);
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

/**
 * Asks a Go endpoint for one database call's result, in the shape
 * supabase-js gives it: { data, error }. Modules that decide by the error's
 * code use this, so everything after the call stays as it was. Without a
 * reply, the error is the one supabase-js gives when the database cannot be
 * reached.
 */
export async function goResult(path, init) {
  let response;
  try {
    response = await fetchWithSession(path, init);
  } catch (error) {
    return { data: null, error: { message: `${error?.name ?? 'FetchError'}: ${error?.message}`, details: '', hint: '', code: '' } };
  }
  try {
    const answer = await response.json();
    if (answer && typeof answer === 'object' && 'error' in answer) return { data: answer.data ?? null, error: answer.error };
  } catch {
    // Not the expected answer; reported below.
  }
  return { data: null, error: { message: `Go answered ${response.status}`, details: null, hint: null, code: `${response.status}` } };
}
