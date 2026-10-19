// Module hooks for running a browser data module in plain Node: the
// browser's Supabase client (`@/lib/supabase/client`) becomes the one
// browser-db-fixture.mjs builds around a stand-in Supabase. Everything else
// resolves as route-loader.mjs resolves it.
import { resolve as resolveRoute, load } from './route-loader.mjs';
export { load };
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabase/client') {
    return { url: 'data:text/javascript,' + encodeURIComponent(
      'export function createClient() { return globalThis.__browserClient(); }'
    ), shortCircuit: true };
  }
  return resolveRoute(specifier, context, nextResolve);
}
