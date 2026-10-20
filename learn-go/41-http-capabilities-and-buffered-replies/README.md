# 41: Bind credentials and hold a reply

Real code: [http.go](../../backend/internal/apikey/http.go) and
[http_search.go](../../backend/internal/apikey/http_search.go). These HTTP
adapters are built and tested but are not registered in the running server.
Database access and rollout are separate steps.

## A function can return a smaller interface

In JavaScript, a session helper could return `{ owner, keys }`. Go expresses
that boundary in a function type:

```go
type SessionFactory func(context.Context, string) (string, Manager, error)
```

The string argument is the caller's Supabase bearer. The function must verify
it and return the verified owner plus a `Manager` bound to that user's token.
The handler gets create/list/revoke methods, not the server's accounting methods.
The future database adapter must still preserve RLS; an interface cannot prove
that the factory actually verified a token or used the correct database role.

Management and API-key execution accept different credentials. A playground
key does not become a Supabase session. Public search constructs a fresh HTTP
request instead of copying the incoming request's headers. That prevents a
cookie, session, API key or private GitHub token from becoming an upstream header.

## Decode names before values

Decoding JSON directly into a Go struct accepts case variants of its field
names. For a new security boundary, `decodeCreation` first walks the object's
tokens. It accepts exactly `name` and `scopes`, remembers names already seen,
then decodes the values. A map alone loses duplicate members, so it cannot
tell you whether the original JSON repeated a field.

The same distinction matters when checking public repository visibility.
The existing JavaScript-compatibility reader deliberately keeps the last
duplicate member, as JSON.parse does. The new public result guard must instead
reject a duplicate `private` member. A failing test caught this difference.

## A response writer can keep bytes private for a while

Normally `http.ResponseWriter.Write` sends bytes to the caller. The search
adapter supplies its own writer with a `bytes.Buffer`. It runs these steps:

1. Validate the key and reserve an attempt atomically.
2. Run public search into the bounded buffer.
3. Confirm server-side usage completion.
4. Send the buffered reply if completion is confirmed.

If step3 fails, the HTTP response is a fixed503. The provider's successful body
has not escaped. A server-only recovery sink gets the exact safe completion
record; the browser gets no private receipt or raw storage error.

Buffering needs a size bound. The important check happens **before append**:

```go
if len(chunk) > limit-len(buffer) {
    return 0, errTooLarge
}
```

This refuses a chunk that would exceed the bound without partially changing
the buffer. In JavaScript, think of checking before `chunks.push(chunk)`.

## Cancellation and socket deadlines solve different problems

A context deadline can cancel outbound HTTP calls. It does not interrupt every
incoming `Body.Read`. The adapter also installs a socket read deadline before
verification/body work and keeps it during HTTP body draining. A read timeout
may arrive before the context timer runs, so it checks the I/O timeout itself.

The request budget, completion budget and recovery budget are bounded together.
`context.WithoutCancel` is used only for short completion/recovery work; it is
not permission to run a provider call after the caller cancels.

## Your exercise

Complete `appendBounded` in the new `exercise.go`. Return the appended byte
count on success. If the whole chunk would exceed a nonnegative limit, return
zero and `errTooLarge` without changing the buffer. A negative limit is invalid.
An empty chunk succeeds when the existing buffer fits the limit.

From `learn-go/`:

```powershell
go test ./41-http-capabilities-and-buffered-replies
go test -tags solution ./41-http-capabilities-and-buffered-replies
```

The first command intentionally fails until you implement your exercise. The
solution command checks the supplied answer without editing your file.
