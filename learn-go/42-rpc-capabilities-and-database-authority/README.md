# 42: Give the database the authority

Real code: [rpc.go](../../backend/internal/apikey/rpc.go),
[rpc_accounting.go](../../backend/internal/apikey/rpc_accounting.go) and
[rpc_json.go](../../backend/internal/apikey/rpc_json.go).
These adapters are implemented locally; the proposed SQL has not been applied
to Supabase, and the new endpoints are not registered in the server.

## A method can retain one verified capability

`RPCClient.Sessions()` returns a function matching `SessionFactory`. It asks
Supabase Auth about the bearer using `SignedInUser`, rejects anonymous accounts,
then returns an `ownerRPC` containing that same bearer and verified owner.

In JavaScript this resembles a closure around `verifiedUser` and `accessToken`:

```js
return { list: () => callRpc('sefgh_key_list', {
  p_after_created: null, p_after_selector: null
}, accessToken) }
```

Go can store the captured values in private struct fields instead. Methods
implement the small `Manager` interface. An owner argument must match the bound
owner before any network request. The RPC body contains no caller-selected
owner. SQL derives ownership from the authenticated session again.

Private fields are not automatic log protection. A value receiver `Format`
redacts both values and pointers; `MarshalJSON` refuses to serialize the
credential-bearing capability. The client owns a fresh HTTP transport so a
shared cookie jar, credential wrapper, proxy or redirect cannot change this
boundary. It sends the configured project public key with the user bearer.

## SQL issues; Go reveals

The earlier in-memory service generates material in Go and calls `Management`.
The real owner RPC instead generates randomness inside PostgreSQL. An
authenticated caller cannot choose a weak hash, owner, lifetime or quota by
calling that RPC directly. `ownerRPC` therefore implements `Manager` directly.

Its reply is decoded into a small struct. Go checks the credential format,
metadata and selector together, then wraps the returned string in the existing
copy-safe `Secret` handle. An ambiguous network failure returns no secret and
does not repeat issuance. The user can list metadata and revoke an orphaned key.

`strictRPCJSON` adds two checks that normal `encoding/json` struct decoding does
not provide: duplicate members are refused, and member names must match their
canonical spelling. It also rejects missing/extra fields and trailing JSON.

## Accounting has a different capability

`RPCAccounting` retains only the separately provisioned accountant bearer and
the policy loaded from its restricted RPC. It cannot create, list or revoke an
owner's keys. `NewExecutor` builds a service with accounting and no management.

`Reserve` sends exactly five arguments: selector, verifier, request id, fixed
endpoint and policy revision. The database decides ownership, expiry, window,
limits and admission time. A lock can take time to acquire, so SQL reads its
clock **after** the owner lock. It reserves both counters and the attempt in one
transaction before provider work. Go's clock is useful for reporting, never a
replacement for authoritative admission in storage.

Completion and recovery send an exact safe receipt. `Pending` can discover an
attempt even if the process died before storing a receipt. A missing receipt
means the outcome is unknown; it does not authorize another provider request.
There is no production recovery worker in this batch.

Recovery and owner-history RPCs use keyset pages of at most100 rows. A cursor
contains a timestamp and id, so rows sharing a timestamp still make progress.
Compare timestamps with `Time.Equal`, not `==`: SQL's `+00:00` and Go's `Z`
can represent the same instant with different location values inside Go.

## Your exercise

Complete the new `reserveArgs` in `exercise.go`. Return exactly the five allowed
RPC fields. Reject an empty revision, empty request id or an endpoint other than
`public-search`. Never include the input's owner, requested time or limits.
Those values belong to the database's decision, even when the caller supplies
them. This exercise practices selecting authority; the production adapter also
validates canonical credential components and approved policy bounds.

From `learn-go/`:

```powershell
go test ./42-rpc-capabilities-and-database-authority
go test -tags solution ./42-rpc-capabilities-and-database-authority
```

The first command fails until you finish the exercise. The second checks the
supplied answer without changing your file.
