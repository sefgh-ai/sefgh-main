# Lesson 16: Verifying access before a handler runs

**Real code:** `backend/internal/githubaccess/access.go` and
`backend/cmd/api/main.go`. Read lesson 06 on HTTP handlers first.

A token is a credential, not a user ID. Reading text from a JWT does not prove
who issued it. SEFGH asks Supabase Auth to verify the session, then asks GitHub
who owns the supplied GitHub token. The provider ID in the verified Supabase
identity must match GitHub's numeric account ID. GitHub then decides whether
that token may read each repository. We never substitute the owner's token.

In JavaScript, a wrapper can return a new function:

```js
const wrap = (handler) => async (request) => {
  const access = await verify(request);
  if (!access.ok) return new Response('Denied', { status: 401 });
  return handler(request);
};
```

Go uses the same idea. `Verifier.Wrap` returns an `http.HandlerFunc`. Before
calling `ServeHTTP` on the real handler, it runs `Resolve`. A rejected caller
never reaches the repository code. This protects the Go URL even when someone
bypasses Next.js entirely.

`Resolve` returns two values: the verified token and an HTTP status. An empty
token with status 200 means a public request. A status other than 200 means
stop. It is important not to confuse those outcomes.

## Giving an operation a deadline

```go
ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
defer cancel()
```

Both identity calls share this deadline. `NewRequestWithContext` passes it to
the HTTP client. `defer cancel()` releases the timer when verification ends.
Cancellation also propagates from a caller who disconnects.

## Copy settings, never share private results

An `http.Client` can be shared for concurrent requests. Here a copy of its
settings changes `CheckRedirect` without modifying another caller's client.
Redirects are refused for authenticated calls so a credential cannot travel
to an unexpected destination.

Public summary replies retain their cache. Private summaries call GitHub on
every request, and private replies carry `Cache-Control: private, no-store`.
Even caching separately for each user would be insufficient: the user may
lose repository access between requests. The server creates private handlers
per request and never mutates a global token.

## Your exercise

Implement `sameAccount` in the new `exercise.go`. It receives the provider ID
from a verified identity and the numeric ID returned by GitHub. Return true
only for a positive account ID whose decimal representation matches exactly.
For example, `"101"` and `101` match; `"0101"` and `101` do not.

Run from `learn-go`:

```text
go test ./16-verifying-access
go test -tags solution ./16-verifying-access
```

This exercise only compares already-verified IDs. It is not a token verifier.
The real issuer calls and two-user isolation are tested separately using
`contracts/github-access/`; no real credentials are needed for those tests.

GO-006b adds `/api/github/trending` to the public-only exceptions alongside
health and languages. It ignores incoming credentials and never forwards a
GitHub token, matching its Next.js handler; this is not private search.

GO-007b adds public-only `/api/github/trending-developers`, ignoring caller
credentials and forwarding no token. Lesson 18 explains its bounded workers.
