import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 *
 * @supabase/ssr already memoizes this per browser context, so no extra caching
 * is needed. The previous version stashed the client on `globalThis` when
 * `window` was undefined — on the server that object is shared across every
 * concurrent request, so one user's auth state could leak into another's.
 * Never cache a Supabase client on a server global.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example)."
    );
  }

  return createBrowserClient(url, key);
}
