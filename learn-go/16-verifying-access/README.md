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
const DefaultTimeout = 4 * time.Second

func (v Verifier) deadline(r *http.Request) (context.Context, context.CancelFunc) {
	timeout := v.Timeout
	if timeout == 0 {
		timeout = DefaultTimeout
	}
	return context.WithTimeout(r.Context(), timeout)
}
```

`Resolve` starts with `ctx, cancel := v.deadline(r)` and then `defer cancel()`.
Both identity calls share this deadline. `NewRequestWithContext` passes it to
the HTTP client. `defer cancel()` releases the timer when verification ends.
Cancellation also propagates from a caller who disconnects.

The `Timeout` field is there for tests. A test that had to wait four real
seconds to see the deadline work would be slow, so it sets 30 milliseconds.
Zero is Go's value for "nobody set this", which is why zero means "use the
default". A second test checks that the default is still four seconds, and a
test in `cmd/api` checks that four seconds of verification plus the slowest
handler still fit inside the time the server allows for one reply.

## Check a reply field by field

Supabase and GitHub answer in JSON. A struct would say "the reply looks like
this" and fail on anything else. This code must refuse a strange reply the
same way the JavaScript check does, case by case, so it decodes into `any`
and asks about each field, as lesson 05 describes:

```go
user, _ := reply.(map[string]any)
identities, isList := user["identities"].([]any)
if !truthy(user["id"]) || truthy(user["is_anonymous"]) || !isList {
	return "", 403
}
for _, entry := range identities {
	identity, _ := entry.(map[string]any)
	if id, isText := identity["id"].(string); identity["provider"] == "github" && isText && id != "" {
		linked[id] = true
	}
}
```

Three checks in that loop each close a door. The provider must be `github`:
an account linked through another provider with the same number is not this
GitHub account. The id must be text, and not empty. An entry that is `null`
or the wrong shape is skipped, because asking a `nil` map for a key is safe.

`truthy` and `safeInteger` are two small functions below `Resolve`. They
answer the way JavaScript's `if (value)` and `Number.isSafeInteger(value)`
do, so both backends agree on every case in `contracts/github-access/`.

## Test the wiring that runs

`newHandler` in `cmd/api/main.go` builds everything the server serves. `run`
calls it, and so do the tests:

```go
func newHandler(logger *slog.Logger) http.Handler {
	verifier := githubaccess.Verifier{ /* from the environment */ }
	public := &publictoken.Transport{ /* the public read token, from the environment */ }
	github := verifier.Wrap(githubMux(logger, "", public), func(token string) http.Handler { return githubMux(logger, token, nil) })
	// ... the AI routes are served beside github, then markBackend wraps it all
}
```

The `""` is the important character pair: handlers for callers without
credentials get no caller token at all. The only credential their requests
can carry is the server's public read token, which `public` adds only after
GitHub confirms it can read nothing private (lesson 21). The handlers for a
verified caller get `nil`, the plain transport, so the two never mix. An
earlier test built this line again inside
the test. It passed even when the real line was changed to hand out the
server's own token, because it was checking its own copy. A test proves
something about the code it calls and nothing about code that looks similar.

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

## The Supabase half on its own (AI-002c)

Chat needs to know who is calling but needs no GitHub token. `SignedInUser`
in `session.go` asks Supabase only, and shares three small pieces with
`Resolve`: `sessionToken` reads the bearer, `deadline` is the function above,
and `askSupabase` makes the call. Its rules differ in one way: an anonymous
account is 401 here, where `Resolve` answers 403, because the chat contract
says so. Lesson 20 shows how the chat handler is given it.

ACT-002 moved the shared part of `SignedInUser` into `account`, and added
`User` beside it for the activity route: there an anonymous account is a
user, and the session itself is handed back so the database can be asked
as that user. Lesson 22 uses it.

The bearer pattern used to start with `(?i)`, Go's "ignore case". Go applies
that to every letter in the pattern, using Unicode's rules, so `[A-Za-z]`
also matched the long s (U+017F) and the Kelvin sign (U+212A). JavaScript's
`/i` does not. The pattern now spells the word out, `[Bb][Ee][Aa][Rr][Ee][Rr]`,
and leaves the token's letters as plain ASCII.

## Remembering a session for a minute (R-042)

Every signed-in request used to ask Supabase Auth "whose session is this?", even when the same person sent ten requests in a second. Since 2026-10-28 a successful answer is kept for `MemoryFor`, 60 seconds, in `backend/internal/githubaccess/memory.go`:

```go
func (v Verifier) askSupabase(ctx context.Context, session string) (any, int) {
	key := memoryKey("supabase", session)
	if reply, found := v.Memory.recall(key); found {
		return reply, 200
	}
	reply, status := v.get(ctx, ..., session)
	if status == 200 {
		v.Memory.keep(key, reply)
	}
	return reply, status
}
```

Three Go ideas are in there:

- **An array can be a map key.** `memoryKey` returns `sha256.Sum256(...)`, a `[32]byte`. Arrays of comparable things are comparable in Go, so `map[[32]byte]memoryEntry` works. In JavaScript two arrays are never `===`, so you would turn the hash into a string first. Keying by the hash means the session itself is never stored.
- **A method can be called on a nil pointer.** `recall` and `keep` start with `if m == nil { return ... }`. A `Verifier` built without `Memory` has a nil `*Memory`, and calling `v.Memory.recall(key)` is still safe: it simply answers "not found". That keeps every test fixture that builds a plain `Verifier` working unchanged.
- **A mutex guards the map.** Requests run on many goroutines at once, and Go maps are not safe for concurrent writes, so `recall` and `keep` hold `m.mu` while they touch `m.entries`.

Only successes are kept: a refused session is asked about every time, so a wrong session cannot be "remembered" into working. GitHub tokens are deliberately not remembered: `contracts/github-access/isolation.json` pins that a revoked GitHub token is refused at once, before any private repository is read. The cost of remembering sessions is that someone who signs out can still pass for up to a minute; you accepted that trade.
