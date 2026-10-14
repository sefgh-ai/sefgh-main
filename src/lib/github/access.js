import { publicGitHubFetch } from '@/lib/github/public-token';

// Verify each bearer pair with its issuer. Never decode unverified JWT claims,
// trust user_metadata, parse SSR cookies, or fall back to the owner's token.
const tokenPattern = /^[A-Za-z0-9._~+\/-]+=*$/;
export const accessError = 'GitHub authorization failed';
// Both identity calls together. The Go backend uses the same value.
export const IDENTITY_DEADLINE_MS = 4000;

// askIssuer makes one identity call. It answers { status: 200, body } with
// the decoded reply, { status: 401 } when the issuer refused the credential,
// and { status: 503 } when it did not answer as expected. It can also throw,
// for a network failure, a reply over 1 MiB or a reply that is not JSON; the
// caller answers 503 for those.
export async function askIssuer(send, signal, url, headers) {
  const response = await send(url, { headers, signal, cache: 'no-store', redirect: 'error' });
  // Only a plain 200 is an answer. Go applies the same rule.
  if (response.status !== 200) return { status: [401, 403].includes(response.status) ? 401 : 503 };
  // Bound identity responses, including chunked bodies.
  const reader = response.body.getReader();
  const parts = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 1024 * 1024) throw new Error('identity reply too large');
      parts.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return { status: 200, body: JSON.parse(new TextDecoder().decode(bytes)) };
}

export async function resolveGitHubAccess(request, options = {}) {
  const auth = request.headers.get('authorization') || '';
  const token = request.headers.get('x-github-token') || '';
  if (!auth && !token) return { status: 200, token: '' };
  const session = /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/i.exec(auth)?.[1];
  if (!session || !tokenPattern.test(token) || session.length > 8192 || token.length > 8192) return { status: 401 };
  const base = options.supabaseURL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = options.supabaseKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return { status: 503 };
  const send = options.fetch ?? fetch;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(options.deadlineMs ?? IDENTITY_DEADLINE_MS)]);
  const check = (url, headers) => askIssuer(send, signal, url, headers);
  try {
    const user = await check(`${base.replace(/\/+$/, '')}/auth/v1/user`, { Authorization: `Bearer ${session}`, apikey: key });
    if (user.status !== 200) return user;
    const identities = user.body?.identities;
    if (!user.body?.id || user.body.is_anonymous || !Array.isArray(identities)) return { status: 403 };
    // Only an identity Supabase itself recorded for the GitHub provider counts.
    // An entry of the wrong shape is skipped, not treated as an outage.
    const linked = identities.filter(i => i && i.provider === 'github' && typeof i.id === 'string' && i.id !== '');
    if (!linked.length) return { status: 403 };
    const github = await check(`${options.githubURL ?? 'https://api.github.com'}/user`, { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'SEFGH' });
    if (github.status !== 200) return github;
    if (!Number.isSafeInteger(github.body?.id) || github.body.id <= 0 || !linked.some(i => i.id === String(github.body.id))) return { status: 403 };
    return { status: 200, token };
  } catch { return { status: 503 }; }
}

export function withGitHubAccess(handler) {
  return async (request, context) => {
    const access = await resolveGitHubAccess(request);
    const response = access.status === 200
      ? await handler(request, context, access)
      : Response.json({ error: accessError }, { status: access.status });
    // Authenticated replies and failures may never enter a browser/CDN cache.
    if (access.token || access.status !== 200) response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
}

export function githubFetch(url, token, init = {}) {
  if (token && new URL(url).origin !== 'https://api.github.com') throw new Error('Untrusted GitHub URL');
  // Signed out: the server's public-only token, when one is set and checked
  // (QUOTA-001). Without it this is the plain fetch it always was.
  if (!token) return publicGitHubFetch(url, { ...init, headers: { ...init.headers } });
  return fetch(url, {
    ...init,
    next: undefined, cache: 'no-store', redirect: 'error',
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}
