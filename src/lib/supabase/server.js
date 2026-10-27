import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { serverRoutedFetch } from '@/lib/supabase/data-routing'

/**
 * Server Supabase client, signed in by the session cookie.
 *
 * With `goData`, the Data API requests of areas switched to Go go through
 * the Go data proxy, as the browser client's do (DATA-010). It is for code
 * that reads or writes an area's data on the server: the repository page
 * and the sign-in callback. Route handlers leave it off, so a switched
 * area never sends a Next.js handler's own writes through the proxy's
 * rules; each handler moves to Go by its own switch.
 */
export async function createClient({ goData = false } = {}) {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const routed = goData ? serverRoutedFetch(url) : undefined

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
      ...(routed && { global: { fetch: routed } }),
    }
  )
}
