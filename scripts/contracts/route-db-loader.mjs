// Only this test process substitutes the session/database boundary. The
// fixture runner in route-db-fixture.mjs sets globalThis.__routeClient to
// build the client.
import { resolve as resolveRoute, load } from './route-loader.mjs';
export { load };
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabase/server') {
    return { url: 'data:text/javascript,' + encodeURIComponent(
      'export async function createClient() { return globalThis.__routeClient(); }'
    ), shortCircuit: true };
  }
  return resolveRoute(specifier, context, nextResolve);
}
