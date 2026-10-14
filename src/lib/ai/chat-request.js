import { fetchWithSession } from '@/lib/supabase/session-fetch'

/**
 * Sends one request to POST /api/ai/chat as the signed-in user, with the
 * Supabase bearer the Go backend needs (see fetchWithSession).
 */
export async function postChat(body) {
  return fetchWithSession('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
