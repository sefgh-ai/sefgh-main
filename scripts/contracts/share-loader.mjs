// Only this test process substitutes the session/database boundary. The
// fixture runner sets globalThis.__shareClient to build the client.
import { resolve as resolveRoute, load } from './route-loader.mjs';
export { load };
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabase/server') {
    return { url: 'data:text/javascript,' + encodeURIComponent(
      'export async function createClient() { return globalThis.__shareClient(); }'
    ), shortCircuit: true };
  }
  return resolveRoute(specifier, context, nextResolve);
}
