/**
 * The server's token for GitHub reads made for signed-out visitors (QUOTA-001).
 *
 * Without a token, every signed-out read shares the 60 requests an hour GitHub
 * allows one address. The owner approved a server token for these reads on
 * condition that it can read only public data. That is checked, not assumed:
 *
 * - It must be a classic personal access token with no scopes. GitHub says so
 *   with an empty X-OAuth-Scopes header on GET /user. A fine-grained token sends
 *   no such header, so what it can read cannot be checked, and it is refused.
 * - A passed check lasts ten minutes; a refusal is retried after one.
 * - A reply that shows scopes, or a 401, is thrown away and the request is sent
 *   again without the token, so data read with a private-capable token is never
 *   served.
 * - Only GET requests to the GitHub API origin that carry no Authorization of
 *   their own get the token. A signed-in caller's token is never replaced.
 *
 * The Go backend applies the same rules (backend/internal/publictoken); both
 * pass contracts/public-read-token. The token itself is never logged.
 */

export const PUBLIC_TOKEN_TRUST_MS = 10 * 60 * 1000;
export const PUBLIC_TOKEN_RETRY_MS = 60 * 1000;
const CHECK_DEADLINE_MS = 4000;

export const GITHUB_API_ORIGIN = 'https://api.github.com';

// A reply's scopes are acceptable only when the header is there and empty.
function noScopes(response) {
  const scopes = response.headers.get('x-oauth-scopes');
  return scopes !== null && scopes.trim() === '';
}

/**
 * Returns a fetch-like function that adds the public token where the rules
 * allow it. `send` is the real fetch; tests pass a stand-in.
 */
export function createPublicReader({ token, origin, send = (url, init) => globalThis.fetch(url, init), now = Date.now, log = () => {} }) {
  let usable = false;
  let until = 0; // the moment the last answer stops counting
  let checking = null; // the check in progress, shared by everyone waiting

  async function check() {
    let passed = false;
    let reason = 'GitHub could not be asked';
    try {
      const response = await send(`${origin}/user`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'SEFGH' },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(CHECK_DEADLINE_MS),
      });
      passed = response.status === 200 && noScopes(response);
      const scopes = response.headers.get('x-oauth-scopes');
      reason = response.status !== 200 ? `status ${response.status}`
        : scopes === null ? 'no X-OAuth-Scopes header: not a classic token'
          : `scopes "${scopes.trim()}"`;
      await response.body?.cancel();
    } catch {
      // reason stays "could not be asked"
    }
    usable = passed;
    until = now() + (passed ? PUBLIC_TOKEN_TRUST_MS : PUBLIC_TOKEN_RETRY_MS);
    if (!passed) log(`GitHub public read token not used: ${reason}`);
    return passed;
  }

  async function isUsable() {
    if (now() < until) return usable;
    checking ??= check().finally(() => { checking = null; });
    return checking;
  }

  return async function read(url, init = {}) {
    const method = (init.method ?? 'GET').toUpperCase();
    const own = new Headers(init.headers).has('authorization');
    if (!token || method !== 'GET' || own || new URL(url).origin !== origin || !(await isUsable())) {
      return send(url, init);
    }
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await send(url, { ...init, headers });
    if (response.status !== 401 && (response.headers.get('x-oauth-scopes') === null || noScopes(response))) {
      return response;
    }
    // The token changed since it was checked. This reply may hold data it
    // should not have read: throw it away and ask again without the token.
    await response.body?.cancel();
    usable = false;
    until = now() + PUBLIC_TOKEN_RETRY_MS;
    log(`GitHub public read token not used: a reply showed ${response.status === 401 ? 'status 401' : 'scopes'}`);
    return send(url, init);
  };
}

// The reader the app uses. It is rebuilt if the variable changes, which only
// tests do.
let shared = null;
let sharedToken = null;

/**
 * fetch for a GitHub read made for a signed-out visitor. With
 * GITHUB_PUBLIC_READ_TOKEN unset, it is exactly fetch.
 */
export function publicGitHubFetch(url, init) {
  const token = process.env.GITHUB_PUBLIC_READ_TOKEN || '';
  if (shared === null || sharedToken !== token) {
    shared = createPublicReader({ token, origin: GITHUB_API_ORIGIN, log: (message) => console.error(message) });
    sharedToken = token;
  }
  return shared(url, init);
}

/** Forgets the shared reader's last check. For tests. */
export function resetPublicGitHubFetch() {
  shared = null;
  sharedToken = null;
}
