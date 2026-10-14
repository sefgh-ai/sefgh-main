// Only the chat test processes use this. It replaces the cookie-session
// client, which needs a running Next.js request, and the browser client,
// which needs a browser, with ones a test controls. Everything else,
// including the real AI helper, resolves as usual.
import { resolve as resolveRoute, load } from './route-loader.mjs';
export { load };
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabase/server') {
    return { url: 'data:text/javascript,' + encodeURIComponent(
      'export async function createClient() { if (globalThis.__chatSupabaseFails) throw new Error("no client"); return { auth: { getUser: async () => globalThis.__chatCookieSession ?? { data: { user: null }, error: { message: "Auth session missing!" } } } }; }'
    ), shortCircuit: true };
  }
  if (specifier === '@/lib/supabase/client') {
    return { url: 'data:text/javascript,' + encodeURIComponent(
      'export function createClient() { return { auth: { getSession: async () => { if (globalThis.__chatBrowserFails) throw new Error("no session"); return globalThis.__chatBrowserSession ?? { data: { session: null }, error: null }; } } }; }'
    ), shortCircuit: true };
  }
  return resolveRoute(specifier, context, nextResolve);
}
