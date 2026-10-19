// Which areas of the browser's own database calls go through Go, and how a
// browser module asks Go (docs/plans/browser-data.md; the owner's choice of
// 2026-10-19). NEXT_PUBLIC_SEFGH_GO_DATA lists the areas, comma-separated.
// Next.js fixes it at build time, so a change needs a redeploy. The same
// setting adds the area's rewrite to the Go server (next.config.mjs).
import { fetchWithSession } from '@/lib/supabase/session-fetch';

/** Whether an area is switched to Go. */
export function usesGo(area, setting = process.env.NEXT_PUBLIC_SEFGH_GO_DATA) {
  return String(setting ?? '').split(',').map((name) => name.trim()).includes(area);
}

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
