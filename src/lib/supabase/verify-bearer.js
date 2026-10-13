import { askIssuer, IDENTITY_DEADLINE_MS } from '@/lib/github/access'

/**
 * Asks the project's Supabase Auth who a bearer token belongs to. The token is
 * never decoded here: an unverified claim proves nothing.
 *
 * Answers one of:
 *   { status: 200, userId }  a signed-in user who is not anonymous
 *   { status: 401 }          no bearer, a malformed one, or Supabase refused it
 *   { status: 503 }          Supabase could not be asked
 *
 * This is the only form of sign-in the Go backend accepts, so both backends
 * are tested against the same cases.
 */
export async function verifySessionBearer(request, options = {}) {
  const auth = request.headers.get('authorization') || ''
  const session = /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/i.exec(auth)?.[1]
  if (!session || session.length > 8192) return { status: 401 }
  const base = options.supabaseURL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = options.supabaseKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !key) return { status: 503 }
  const send = options.fetch ?? fetch
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(options.deadlineMs ?? IDENTITY_DEADLINE_MS)])
  try {
    const user = await askIssuer(send, signal, `${base.replace(/\/+$/, '')}/auth/v1/user`, { Authorization: `Bearer ${session}`, apikey: key })
    if (user.status !== 200) return { status: user.status }
    const id = user.body?.id
    if (typeof id !== 'string' || id === '' || user.body.is_anonymous) return { status: 401 }
    return { status: 200, userId: id }
  } catch {
    return { status: 503 }
  }
}
