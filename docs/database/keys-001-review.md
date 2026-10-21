# KEYS-DB-001: database proposal for owner review

Status: local foundation independently reviewed; additive SQL **applied only to
the owner-approved development project**. No production SQL, runtime enablement
or deployment. This document separates development acceptance from rollout.

Owner update2026-10-21: the separate test project `sefgh-migration-dev`
(`mraglhrenqwadegvwxts`, Mumbai) is now created and catalog preflight verified.
Owner approved the exact additive SQL for this project, it applied successfully,
and catalog/definition checks pass; no policy seeded. [Staging record](keys-staging.md) identifies the exact
review files/hashes and hosted acceptance sequence. Owner chose rotation to v1;
old keys may be revoked only at a separately approved cutover. No conversion,
policy seed or production change is authorized by project creation.

The named SEFGH MCP account now exposes the expected User-DB project
`kohwfuxqbllsmvmsfqci`. On 2026-10-21 only catalog SELECTs were run. The
[snapshot](key-catalog-2026-10-21.json) includes query provenance, columns,
RLS/policies, grants, constraints, triggers, role memberships, extension
locations, default ACLs and all 25 non-extension public application functions.
No actual key, user, usage or credential row was read. Repo-DB was not queried.

## What is proposed

The [migration](../../supabase/migrations/20261021063751_keys_001_hashed_lifecycle.sql)
adds six private `sefgh_keys` tables, fixed-path private helpers and nine public
invoker RPC wrappers. It changes no old key, limit or log table, row, policy or
function. There is deliberately **no rollout policy row**: issuance and
admission refuse to operate until a policy is separately approved and installed.
It creates objects without silently replacing collisions and commits atomically.

| Capability | Granted caller | RPCs |
|---|---|---|
| Owner management | Verified non-anonymous `authenticated` user | `sefgh_key_issue`, `sefgh_key_list`, `sefgh_key_revoke` |
| Server accounting | `sefgh_key_accountant` only | `sefgh_key_policy`, `sefgh_key_lookup`, `sefgh_key_reserve`, `sefgh_key_complete`, `sefgh_key_recovery`, `sefgh_key_pending` |
| Direct private table access | No browser, service-role or accountant grant | All six tables have RLS enabled and no direct grants |

Private helpers enforce input and ownership themselves. Their grants match the
wrappers, so direct SQL helper invocation does not skip the boundary. Authenticated
issuance generates a 12-byte public selector plus 32-byte secret using pgcrypto,
hashes the complete canonical credential with SHA-256, and returns plaintext
only in that issuance reply. Metadata never contains its hash or secret.
Management sends the verified user's bearer; it cannot choose another owner,
expiry, hash, limit or unsupported scope in an RPC argument.

Accounting uses a separate NOLOGIN/NOINHERIT/NOBYPASSRLS role, with membership
granted to the existing PostgREST authenticator for role selection. It owns no
objects and is not a member of authenticated, service_role or pg_read_all_data.
These attributes alone are insufficient: inherited PUBLIC/schema/function
privileges and unrelated tables must be audited using the
[read-only verification SQL](../../supabase/checks/keys_001_verify.sql).
The fresh catalog found no PUBLIC-granted application relation; the two PUBLIC
extension views are pg_stat_statements and pg_stat_statements_info. PUBLIC
execution of existing invoker functions still exists. Do not claim the role has
literally no other function execution; verify it cannot read/mutate unrelated
application data or reach an elevated unrelated mutator before provisioning it.

The PostgreSQL pattern uses restricted EXECUTE and fixed search paths as
described by [Supabase's database-function documentation](https://supabase.com/docs/guides/database/functions).
The proposed private schema is not to be added to the exposed Data API schemas.

## Admission, accounting and uncertain outcomes

The sole supported endpoint/scope is `public-search` / `repo:read:public`.
Policy includes an explicit `attempt` charging mode, revision, active cap, name
bound, lifetime, fixed window, per-key/per-owner limits and completion budget.
Current numeric values appear **only in synthetic tests**. No production quota,
expiry or retention was selected by this implementation.

An owner advisory lock serializes issuance, revocation and reservation. Admission
holds a share lock on the policy, rechecks the key and reads the database clock
after waiting for the owner lock. Both counters and the pending attempt commit
in one transaction. A request id is globally unique; denied/replayed work does
not call a provider or partially charge a counter. Revocation cannot race past
the recheck. Policy revision mismatch fails closed until the server reloads it.

Completion binds request id, owner, selector, endpoint and exact start time. An
identical retry is idempotent; an unknown/conflicting receipt is rejected.
Recovery stores the exact safe receipt. It includes no raw key, bearer, query,
prompt, arbitrary URL or provider response. A same-database outbox cannot
guarantee a new recovery write during a database outage. The committed pending
attempt is the durable fallback for lost receipts/process death. Its unknown
outcome must not be treated as permission to repeat provider work.

`pending` returns indexed keyset pages of at most100 pending attempts with
optional receipts and a continuation cursor. Unresolved earlier attempts do not
starve later receipts. Owner metadata has descending keyset pages. Go preserves
the proposed HTTP list array within18s/100pages, refusing truncation. UI
pagination remains a rollout consideration for large history. No recovery
worker, automatic abandonment or retention schedule ships here; those remain
prerequisites for production use.
The Go HTTP adapter refuses success when completion is unconfirmed.

## Local evidence and its limits

Run from the repository root on Windows with Docker Desktop running:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-keys-postgres-test.ps1
```

The wrapper creates and removes its own labelled PostgreSQL17.6 container using
a pinned official image digest, no host ports and no network. The stdlib Node
runner accepts only a labelled fixture name/id, never a project URL or password.
It creates synthetic Auth functions/identities and broad legacy/default ACLs,
then executes the actual proposed migration. The CI job repeats this on Linux.
See [verification evidence](../verification/keys-db.md) for actual outcomes.

Native SQL and HTTP adapter stand-ins test different boundaries. They do not
prove hosted PostgREST JWT role selection, Supabase gateway configuration, real
two-user sessions, live grants, realtime behavior, or deployment rollback.

## Remaining gates and safe rollback

1. Additive SQL review/application/catalog verification is complete for the
   isolated development project only, with explicit owner approval and the
   [apply receipt](keys-staging.md). Do not reapply it there. Production review
   and application remain separate gates. The owner must separately review the
   [legacy TRUNCATE privilege hardening proposal](../../supabase/proposals/keys_001_legacy_truncate.sql)
   for R-143. Current broad grants include TRUNCATE; RLS does not cover it.
   Browser/Data API exploitability has not been established. This batch does not
   silently mutate legacy privileges. The hardening proposal preserves CRUD.
2. Verify the actual signing-key mode and an acceptable trusted role-JWT
   provisioning/rotation path. No project signing key is requested, copied or
   minted here. Do not change user Auth hooks to manufacture server roles or
   substitute a service-role credential. Until a narrowly scoped, verified
   capability is provisioned, accounting and runtime wiring stay gated.
3. Approve policy values and operational recovery/retention. Owner selected
   rotation to v1, with old-key revocation only at an approved cutover. Inventory
   actual consumers and review that concrete transition before executing it;
   no automatic conversion, revocation or dual write is included. The bounded
   `RecoverCompletionPage` helper is implemented locally, with no scheduler or
   runtime registration. Recovery capability startup with admissions disabled
   remains a wiring decision.
4. Development catalog/definition verification is complete; actual anonymous/
   userA/userB/accountant denial/admission tests through the gateway remain
   pending, including unrelated effective privilege checks under those real
   credentials. A catalog snapshot and a local bootstrap are not that acceptance
   evidence. Any future production application requires its own approval.
5. Show-once playground implemented/tested (KEYS-UI-001, source6a1ee1a;
   corrected fixture622f7c3, hosted39609303873 SUCCESS). Explicit runtime/forwarding
   switches, preview behavior, failure recovery and route rollback remain before any
   cutover. Existing UI/routes remain in place meanwhile. R039 stays open.

Rollback of code means disabling the new routes/forwarding and stopping new
admissions, retaining hashes, metadata, counters and audit/recovery events. Never
drop the new schema to roll back a deployment, recreate plaintext credentials,
resume browser-authored authoritative counters, or repeat provider calls. A
local transactional drop/ROLLBACK test verifies retained objects/legacy fixture
state only; no real deployment reversal has been tested. Teardown belongs only
to a disposable fixture. If an approved apply fails before COMMIT, PostgreSQL
must roll back its new objects; preserve the error and inspect before retrying.
