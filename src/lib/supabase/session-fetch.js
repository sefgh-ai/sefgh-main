import { createClient } from '@/lib/supabase/client'

/**
 * fetch() for one of this site's own API routes, as the signed-in user.
 *
 * The user's Supabase access token goes in an Authorization header. Next.js
 * would also accept the session cookie, but the Go backend accepts only this
 * bearer, so the browser sends it whichever backend answers. getSession()
 * refreshes an expired token before handing it over.
 *
 * Without a session no header is sent, and the server decides: Next.js
 * falls back to the cookie, Go answers 401. The token goes only to a path
 * on this site; anything else is refused before a request is made.
 */
export async function fetchWithSession(path, init = {}) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    throw new Error('fetchWithSession sends the session only to a path on this site')
  }
  const headers = { ...init.headers }
  try {
    const { data } = await createClient().auth.getSession()
    const token = data?.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    // The session could not be read. Send the request without it.
  }
  return fetch(path, { ...init, headers })
}
