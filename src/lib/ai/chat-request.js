import { createClient } from '@/lib/supabase/client'

/**
 * Sends one request to POST /api/ai/chat as the signed-in user.
 *
 * The user's Supabase access token goes in an Authorization header. Next.js
 * would also accept the session cookie, but the Go backend accepts only this
 * bearer, so the browser sends it whichever backend answers. getSession()
 * refreshes an expired token before handing it over.
 *
 * Without a session no header is sent, and the server decides: Next.js
 * falls back to the cookie, Go answers 401. The token goes only to this
 * same-origin path.
 */
export async function postChat(body) {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const { data } = await createClient().auth.getSession()
    const token = data?.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    // The session could not be read. Send the request without it.
  }
  return fetch('/api/ai/chat', { method: 'POST', headers, body: JSON.stringify(body) })
}
