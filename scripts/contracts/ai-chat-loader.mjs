// Only the chat test process uses this. It replaces the cookie-session
// client, which needs a running Next.js request, with one a test controls.
// Everything else, including the real AI helper, resolves as usual.
import { resolve as resolveRoute, load } from './route-loader.mjs';
export { load };
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabase/server') {
    return { url: 'data:text/javascript,' + encodeURIComponent(
      'export async function createClient() { if (globalThis.__chatSupabaseFails) throw new Error("no client"); return { auth: { getUser: async () => globalThis.__chatCookieSession ?? { data: { user: null }, error: { message: "Auth session missing!" } } } }; }'
    ), shortCircuit: true };
  }
  return resolveRoute(specifier, context, nextResolve);
}
