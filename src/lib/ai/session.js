import { createClient } from '@/lib/supabase/server'
import { verifySessionBearer } from '@/lib/supabase/verify-bearer'

/**
 * Says who is calling an AI route that needs a signed-in user.
 *
 * A bearer token is verified with Supabase Auth; that is the form the Go
 * backend accepts. Without one, the app's own session cookie is used, as the
 * other signed-in routes do, so the browser needs no change.
 *
 * Answers { status: 200, userId }, { status: 401 } or { status: 503 }.
 */
export async function resolveSignedInUser(request) {
  if (request.headers.get('authorization')) return verifySessionBearer(request)
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    const user = data?.user
    if (error || typeof user?.id !== 'string' || user.id === '' || user.is_anonymous) return { status: 401 }
    return { status: 200, userId: user.id }
  } catch {
    return { status: 503 }
  }
}
