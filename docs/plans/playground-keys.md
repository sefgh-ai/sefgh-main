# Real playground keys: KEYS-001

Current2026-10-22: KEYS-RECOVERY-002 implements a separate policy-independent
Go recovery opener. KEYS-ACCEPT-001 prepares the exact-dev-target hosted SQL
gateway runner and test-only policy. The owner separately approved the exact
policy and one provider-free run; policy apply/readback is complete only in dev,
with no lifecycle data. The run awaits separately approved credentials. Its synthetic regressions do not
establish hosted two-user/accountant acceptance. The owner asked why a separate
project exists; the earlier explicit isolated-environment/create/dev-SQL choices
are preserved. No additional project or production migration is being created.
[Current acceptance gates](../database/keys-hosted-acceptance.md).

Owner direction, 2026-10-18: real API keys, shown once, stored only as hashes,
checked on explicitly supported endpoints, with usage written by the server.
Prepare database changes for review before applying them. This is the accepted
product direction, not approval to apply SQL or cut a route over.

Current update2026-10-21 (KEYS-STAGE-001 / KEYS-RECOVERY-001): owner chose
isolated staging and rotation to v1, with old-key revocation only at an approved
cutover. `sefgh-migration-dev` / `mraglhrenqwadegvwxts` was created in Mumbai
after explicit organization and quoted-cost approval. Catalog prerequisites
are verified; owner-approved additive SQL applied and catalog/definitions checked.
No policy or accountant credential provisioned. [Staging and review
sequence](../database/keys-staging.md) is authoritative for the target and gates.
The narrow, unregistered Go helper retries exact stored completion receipts
within explicit row/time limits and leaves missing outcomes pending. Runtime,
scheduler, retention and hosted authorization remain gated. Workers stay off
while their deployment is unknown. Historical records below retain their
original evidence boundaries; the earlier absence of a transition choice is
superseded by the owner's rotation decision.

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

## KEYS-CORE-001 / BUG-014 foundation (2026-10-20)

The owner requested larger batches. Implemented independent work while catalog access remains blocked:

- Current route characterized in29 synthetic cases using the actual Next handler and supabase-js. Version1 is archived; version2 adds only no-store and fixed secret-free failure logging under AGENTS' live security/privacy exception. Status/body/ownership/legacy generation/retries otherwise unchanged. R127-R129 remain pinned/open; R130 corrected locally, not deployed. See [legacy contract](../../contracts/playground-keys/README.md).
- Standard-library `backend/internal/apikey` provides a proposed credential format, SHA-256 verifier, explicit one-time secret handle, redacted formatting/JSON boundaries, and isolated lifecycle service. No HTTP registration, database adapter, new environment switch or service-role credential. The browser still uses its existing route/data flow; R039 is not resolved.
- Management and server-only accounting capabilities are separate Go interfaces. Explicit policy is mandatory. Test-only shared storage models atomic creation limits, validation/reservation/quota/attempt writes, replay rejection, and at-most-once/idempotent completion. Two service instances test shared per-key/per-owner limits, revocation/expiry/scope races, ambiguous writes, cancellation and recovery records. A real adapter must independently prove these properties in its actual transaction/roles; mocks do not establish RLS or distributed quota enforcement.
- [Proposed core contract](../../contracts/api-key-lifecycle/README.md) has11 serial scenarios plus Go concurrency/failure tests. Synthetic scope/endpoint/limits/expiry/window and explicit attempt-charging are test/implementation proposals, not approved production settings. The format is independent of the existing HTTP version2 contract. No existing key conversion/revocation chosen.
- Completion uses a bounded uncancelled context; failure returns a typed safe record for exact retry without repeating upstream work. Ambiguous reservations remain pending and deny replay. Storage-authoritative time controls admission/window, not caller timestamps. Retention/recovery worker and HTTP/provider budgets remain later implementation work.
- Lesson40 covers private secret handles and capability interfaces; owner's existing exercises untouched.

Access checkpoint: owner offered to restore read-only catalog access2026-10-20. A columns-only recheck was still denied MCP-32600. list_projects succeeded but the expected project kohwfuxqbllsmvmsfqci was absent from this connection. No other project queried, rows/credentials read or SQL mutated. Reconnect the account/organization with access to that project; retry catalog only after access changes.

Next batch once definitions are available: independently review additive migration/role-denial/rollback plan; implement the actual user-scoped management and narrowly privileged accounting adapters with conformance/two-user tests, then the default-off supported public endpoint and playground UI. Prepare SQL for owner review before applying it. Preserve no-store/fixed error logging in the replacement rather than reintroducing the privacy defect. Do not choose/run Python workers while their explicit owner gate remains.

## Rollout and acceptance

KEYS-UI-001 (2026-10-21) implements the separate default-off show-once view,
metadata-only client, owner/tab/unmount lifetime, pasted public-search test and
truthful reference. `NEXT_PUBLIC_SEFGH_KEYS_V1=1` is a build-time UI selection,
not runtime registration or rollout approval. No environment was enabled;
missing v1 service fails closed, never falls back to plaintext or browser usage
writes. Protected-page synthetic production probes and independent review are
recorded in [UI evidence](../verification/playground-key-ui.md). Backend
registration/forwarding and all SQL/provisioning/legacy/cutover gates remain.

KEYS-DB-001 (2026-10-21): catalog access now works through the named SEFGH account.
The [SQL review](../database/keys-001-review.md) and [snapshot](../database/key-catalog-2026-10-21.json)
supersede earlier access-denied status. Catalog SELECTs only; additive SQL and
Go owner/accounting adapters implemented/tested locally. No policy seeded or
live SQL applied. Trusted accountant JWT provisioning, hosted effective grants,
owner SQL review, recovery/retention, UI, runtime and cutover remain gates.
This advances KEYS-001a/b, not original route count or R039 closure. See
[verification](../verification/keys-db.md). SQL derives owner/generates secrets;
Go retains the same verified user bearer, with a separate accounting capability.
Indexed100row keyset pages bound history and pending discovery. Go preserves the
proposed HTTP array within18s/100pages and refuses truncation. Recovery pages
include lost receipts without authorizing provider replay or a worker.

KEYS-HTTP-001 (2026-10-20) adds an independent unregistered HTTP foundation:
POST/GET /api/v1/keys, owner-scoped idempotent DELETE and GET /api/v1/search
using the reviewed key core. The [proposed HTTP contract](../../contracts/api-key-http/README.md)
is separate from legacy v2; this is not a parity port of the plaintext route.
Strict JSON/body bounds, verified-owner factory, private-result refusal,
server-generated IDs, an owned credential-free public transport, bounded
completion/recovery and accounting-before-response are tested locally. No
actual database/recovery adapter, UI or production registration is included.
Independent review findings are recorded in REVIEW-015 and the bug register.

Access update: owner confirmed SEFGH is a custom MCP connection in ChatGPT
settings. Its tools are absent in this session; resource inventory reports
unknown server, and the older Supabase connector still denies catalog access.
Do not substitute unrelated listed projects. Refresh connection/session tool
availability, then run the read-only catalog query against the expected ref.

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
