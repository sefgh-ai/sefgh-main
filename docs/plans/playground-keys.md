# Real playground keys: KEYS-001

Owner direction, 2026-10-18: real API keys, shown once, stored only as hashes,
checked on explicitly supported endpoints, with usage written by the server.
Prepare database changes for review before applying them. This is the accepted
product direction, not approval to apply SQL or cut a route over.

## Evidence and the current boundary

The Next.js `POST /api/playground/keys` generates 32 random bytes and stores the
whole `sk_...` key in `public.api_keys`. `ApiKeysTab.jsx` and `TestingTab.jsx`
read that key back through browser Supabase calls. Testing and usage screens
also need to change; a mechanical port of this one route would retain R-039.
The API reference advertises endpoints that do not exist (R-052).

The 2026-10-15 snapshot in [user-db.md](../database/user-db.md) confirms the
plaintext column and owner row rules, but does not contain full column types,
constraints, grants or trigger bodies. On 2026-10-18 the Supabase connector
refused a catalog-only query with `You do not have permission to perform this
action`. No database rows, keys or tokens were read, and no SQL was applied.
Use [the catalog query](../../supabase/checks/keys_001_catalog.sql) to obtain
definitions without selecting key values. This evidence is required before
writing an executable migration for the existing tables.

## Proposed data and access design, for review

The following is a schema proposal; exact DDL and grants wait for the catalog
output and an independently reviewed migration. Names are provisional.

| Object | Contents and rules |
|---|---|
| Private key material | A unique SHA-256 digest of a cryptographically random 256-bit secret, key id, owner id, scopes, timestamps and revocation state. No plaintext column; the digest is never returned to the browser. A stored digest must not itself be accepted as a bearer credential |
| Owner-visible metadata | Id, display name, non-secret prefix/last four, scopes, creation/expiry/revocation and last-used times. A user sees only their own keys. No `select('*')` over private material |
| Usage reservation/counters | Atomic per-key and per-owner counters shared by all instances. Reserve before contacting GitHub or AI. Browser roles cannot write counters; an invalid/revoked key or failed reservation does not spend upstream quota |
| Usage events | Key id, fixed endpoint identifier, request id, start/end, outcome, status and duration. No key, JWT, prompt, query text, provider response or arbitrary visitor URL. An attempt is recorded before upstream work; completion is idempotent and bounded |

Management calls retain the verified Supabase user's bearer and owner checks.
Validation and accounting need a separate, narrowly scoped server capability:
it may validate/reserve/complete usage, not read arbitrary user tables or
impersonate a Supabase user. Decide its exact implementation after the role and
function definitions are available. Do not use a service-role credential for
ordinary CRUD, accept a client-supplied user id, or expose a counter-writing
RPC to anonymous/browser callers. Functions needing elevated rights must fix
their search path, explicitly restrict EXECUTE, and be tested as every caller.
These requirements follow the official [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [database function](https://supabase.com/docs/guides/database/functions) guides.

Creation returns the raw key once, with `Cache-Control: no-store`; it stays only
in the reveal dialog's memory and can be copied there. List/get never reveal it
again. Refresh requires creating a replacement. Revocation is idempotent and
must be enforced across instances without an unbounded acceptance cache.

The first endpoint proposed for explicit API-key support is `GET /api/v1/search`
for public repositories only. This is a proposal, not an existing endpoint.
It must not grant access to private GitHub repositories or browser user-data
operations. Chat/trending are not advertised as supported until implemented
and tested. Existing browser routes keep their existing session/guest rules.

Before enabling keys, agree the initial per-owner/per-key limits, scope list,
maximum active keys, expiration and event retention. These are deployment
settings to review with the concrete migration, not unlimited defaults.

## A batch of three implementation subtasks

1. **KEYS-001a: database boundary and contracts.** Obtain the catalog evidence,
   prepare migration/verification/rollback files, test two-user isolation,
   anonymous denial and server-only accounting locally. Record the old route,
   then version its approved lifecycle contract. Do not apply to production.
2. **KEYS-001b: Go lifecycle and one supported endpoint.** Create/list/revoke
   through the user's bearer, show the secret once, enforce key scopes and
   shared quotas on public search, and write accounting from the server.
   Add contract, concurrency, revocation and failure tests plus a Go lesson.
   Keep the routing switches off pending review and schema rollout.
3. **KEYS-001c: playground and reference.** Replace plaintext-key reads and
   browser usage writes, add the one-time reveal and paste-to-test flow,
   describe only working endpoints, and verify the browser flows.

Checkpoint after each subtask, then run the complete handoff once the batch is
complete. If schema evidence blocks this batch, take avatar characterization
and port together as **AVATAR-001a/b**, after SHARE-002 is committed; keep keys
blocked explicitly. Trending refresh is a separate worker task with R-077,
worker privilege and atomic replacement gates, not a shortcut to 25/25.

## Rollout and acceptance

Prepare an additive schema first, verify role-denial tests, deploy compatible
code, and switch on one endpoint only after owner review. Existing plaintext
keys require an explicit rotate/revoke or one-way conversion plan, based on
their actual consumers; do not silently drop or expose them. Remove plaintext
only after compatible code and owner approval. Rollback must not restore
plaintext secrets or browser-written authoritative counters.

Acceptance includes show-once/list-never-reveal, cross-user denial, expiry and
revocation, concurrent quota reservation, idempotent accounting, upstream
failure/cancellation, no secrets in logs, old/new contract checks and forwarding.
R-039 remains open until the whole lifecycle and supported endpoint are live;
a Go port alone does not close it.
