import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { serverRoutedFetch } from '@/lib/supabase/data-routing'

/**
 * Server Supabase client, signed in by the session cookie.
 *
 * Its Data API requests for the Go data proxy's tables go through the Go
 * server, as the browser client's do (DATA-010); since P7-08b always, with
 * no `goData` option. The route handlers that still make a client touch no
 * proxied table (scripts/contracts/data-proxy.test.mjs checks).
 */
export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: { fetch: serverRoutedFetch(url) },
    }
  )
}
