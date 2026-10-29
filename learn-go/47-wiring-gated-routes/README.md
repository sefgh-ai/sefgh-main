# Lesson 47: Connect a route without enabling it

**Real code:** [keys.go](../../backend/cmd/api/keys.go),
[main.go](../../backend/cmd/api/main.go), the key wiring tests beside them,
and [next.config.mjs](../../next.config.mjs).

The key lifecycle, HTTP handlers and database adapters already existed. This
task connects them to the actual server. The connection is disabled by default;
writing code and activating a service are separate steps.

## An exact flag selects a capability

```go
if os.Getenv("SEFGH_KEYS_V1") != "1" {
    return unavailableKeys(http.StatusNotFound)
}
```

Go compares the whole string. Empty, `0`, `true` and `1 ` all stay disabled.
JavaScript's equivalent is `process.env.SEFGH_KEYS_V1 === "1"`, not a truthiness
check: the text `"0"` would otherwise count as true.

The top-level mux reserves `/api/v1/` before the ordinary GitHub session
middleware. An API key has a different meaning from a Supabase user session.
Keeping these paths separate prevents the wrong authentication path from
handling them. Disabled responses are 404 with `no-store` and make no upstream
request. Misconfigured enabled routes answer a fixed 503, with no fallback.

## Build the handler from narrow pieces

The runtime constructor connects existing pieces:

1. `NewRPCClient` owns the project address, public key and transport.
2. `OpenAccounting` verifies access to the restricted policy RPC and loads the
   database's enabled, approved limits. The program invents no quota defaults.
3. `accounting.Executor(nil)` creates execution without owner-management powers.
4. `client.Sessions()` verifies each owner and retains that same user's bearer.
5. `NewHTTP` joins the two capabilities and the bound `SaveRecovery` method.

A method value such as `accounting.SaveRecovery` remembers its receiver. In
JavaScript you would use `receipt => accounting.saveRecovery(receipt)` or bind
the method. Go can hand the bound method directly to the option field.

No session or public GitHub token becomes the accountant. The public provider
transport never receives owner, API-key or accounting credentials.

## Startup and request deadlines have different jobs

Policy loading has a five-second context while constructing the server, before
`ListenAndServe`. The per-request bound also includes work that intentionally
outlives cancellation: at most 18 seconds for admission/provider work, 10 for
detached accounting completion and 1 for the recovery receipt. That is 29,
below the server's 30-second write timeout. The wiring test checks the complete
sum. A limit checked only around provider work would miss the final two calls.

## A test should cross the real boundary

`keys_lifecycle_wiring_test.go` builds the production mux, with local stand-ins
for Auth, RPC and GitHub. It checks create/list/revoke, that listing reveals no
secret, reservation before provider work, completion before returning success,
revoked-key refusal and recovery after a completion failure.

The optional [routing probe](../../scripts/keys-routing-probe.mjs) goes further:
it builds production Next.js and sends requests through its rewrites to a
compiled Go server. Its receipt distinguishes local stand-ins from live SQL,
browser UI and deployment evidence. It invalidates old success evidence before
starting and stops its own children on cooperative interruption.

## Your exercise

Implement `routeState` in the new `exercise.go`. Return `"off"` unless the flag
is exactly `"1"`. With that flag, return `"unavailable"` if configuration or the
approved policy is missing; otherwise return `"ready"`. These booleans model
configuration, not proof of real authorization.

```text
go test ./47-wiring-gated-routes
go test -tags solution ./47-wiring-gated-routes
```

The first command fails until you fill in the exercise. Lesson checks are
optional under the owner's policy. Existing exercises were not changed.
