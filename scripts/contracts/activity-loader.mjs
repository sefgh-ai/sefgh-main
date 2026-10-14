// Only the activity test process uses this. It replaces the cookie-session
// Supabase client, which needs a running Next.js request, with one the
// fixture controls (globalThis.__activityClient). Everything else resolves
// as usual.
import { resolve as resolveRoute, load } from './route-loader.mjs';
export { load };
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabase/server') {
    return { url: 'data:text/javascript,' + encodeURIComponent(
      'export async function createClient() { return globalThis.__activityClient(); }'
    ), shortCircuit: true };
  }
  return resolveRoute(specifier, context, nextResolve);
}
