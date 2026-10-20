# Proposed API-key core contract, version 1

KEYS-CORE-001 implements `backend/internal/apikey` without a production store,
HTTP endpoint, browser change or feature switch. This is **not** version 1 of
the existing plaintext HTTP route. Its separate contract is in
[`../playground-keys/`](../playground-keys/README.md).

`cases.json` defines language-neutral core transitions with explicit synthetic
policy, owners, symbolic key handles, time advances and expected error classes,
result statuses, metadata counts, attempts and upstream call counts. Go's
`contract_test.go` drives the actual service against the test-only atomic store.
Additional Go tests cover races and failures that do not fit a serial fixture.
The fixture policy is **not an approved deployment quota or expiry policy**.

## Credential and management boundary

Proposed format: `sk_sefgh_v1_<16-character selector>.<43-character secret>`,
canonical unpadded base64url from a 12-byte public selector and 32-byte random
secret. The verifier is SHA-256 of the complete credential. `Parse` never
accepts a digest, legacy `sk_hex`, header text or noncanonical encoding.
Format mechanics are an implementation proposal, not an applied migration or
an authorization to revoke/convert existing keys.

`Issue` takes a **verified** owner's identity, a bounded name and supported
scopes; it generates material and persists only metadata/verifier. Success
returns a one-time secret handle with shared private state, so value/pointer copies cannot reveal twice or bypass formatting/JSON redaction. `List` returns metadata; `Revoke` is scoped
to the owner and idempotent, with foreign and missing selectors indistinguishable.
A default/empty policy fails. No unlimited fallback or production limits are
chosen. Only selector collisions retry (maximum three); an ambiguous write
fails without revealing or automatically making a second write.

## Admission, accounting and recovery boundary

`Management` and `Accounting` are distinct interfaces; neither supplies a
Supabase identity or privileged database credentials. A future management
adapter must use the verified user's token. Accounting requires a separate
server-only capability whose grants and RLS/RPC behavior remain unimplemented.

Before upstream work, `Execute` parses the credential, checks the stored
verifier with constant-time comparison, checks the explicitly supported server
endpoint/scope, then requests an atomic reservation. The store must recheck
verifier, scope, revocation, expiry and both per-key/per-owner limits while
committing the attempt record. Its authoritative clock controls eligibility
and quota windows; the caller's RequestedAt is informational. All instances
must use the same approved policy. A Go lookup is not sufficient authorization
for the later write.

Request IDs must be server-generated and unique; the current core takes that
trusted internal identifier as an argument. A repeated or rebound ID cannot
grant a second upstream execution. The test store uses one mutex to model the
transaction, **not** a production distributed quota implementation. No memory
store is included in the built backend.

The only implemented charging mode is explicitly selected `attempt`: admitted
attempts consume budget even on upstream failure/cancellation. There is no
refund. This is a testable implementation proposal pending owner review before
enabling; the accepted product plan does not select rollout charging semantics.

Completion records only request/key/owner/endpoint identifiers, start/end,
fixed outcome (`success`, `failure`, `cancelled`) and observed status. No raw
key, digest, JWT, name, query, prompt, arbitrary URL, error or provider payload.
Completion uses a timeout with request cancellation removed. Missing/invalid
policy or failed reservation admits zero upstream work. Upstream callbacks
must honor the supplied request context and have provider time/resource limits;
this package cannot forcibly interrupt a callback that ignores cancellation.

Completion is an at-most-once state transition. Identical retries are idempotent;
foreign/unknown/conflicting completion records fail. A completion failure returns
`CompletionError` containing the exact safe record for a trusted recovery worker
to retry, and never reports success. Callback panics (including nil panic modes)
become a fixed failure/status500 without exposing the panic payload; if
completion also fails, the typed recovery record is still returned normally.
Process death, goroutine termination, or a broken/panicking storage adapter
cannot promise a returned record: durable pending-attempt reconciliation is
required for those paths. An ambiguous reservation leaves a pending
attempt and denies replay; recovery must inspect it without re-executing work.
There is no production recovery worker yet. A revoked key does not promise to
cancel work admitted before revocation. Cancellation before work after a
successful reservation records cancelled/status0; other statuses are observed
upstream results or a bounded internal failure status.

## Required later evidence

Real database adapter conformance (two-user/anonymous/capability denial,
transactions, conflicts, partial failures and two-process tests), reviewed SQL,
retention/cleanup policy and recovery worker, authentication middleware,
whole-HTTP-body/provider budgets, no-store response, public-only GitHub upstream,
show-once browser flow, forwarding and rollback. No raw key appears in list/get,
metadata projections or logs. A key must never become a Supabase user token.

R-039 remains open until the entire lifecycle and supported endpoint are live.
Current API-route implementation count is unchanged. See
[the accepted plan](../../docs/plans/playground-keys.md).
