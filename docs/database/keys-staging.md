# KEYS-STAGE-001: isolated test target and acceptance sequence

Status: project created; owner-approved additive key SQL **applied in development only**;
post-apply catalog/definition checks pass. No policy, role credential, test users,
runtime activation or cutover.
This is the current staging record. Earlier access-denied records are history.

## Target and owner decisions

| Item | Verified value |
|---|---|
| Project | `sefgh-migration-dev` |
| Reference | `mraglhrenqwadegvwxts` |
| Organization | `sefgh-ai's` / `hithuduntbsajjhmnntm` |
| Region | Mumbai / `ap-south-1` |
| Creation | 2026-10-21T16:16:41Z, through the named SEFGH MCP account |
| Status at verification | `ACTIVE_HEALTHY` |
| Database | PostgreSQL 17.11, platform version `17.11.0.003` |
| Cost | MCP quoted $0/month; owner explicitly confirmed this quote and target before creation. This is the creation quote, not a guarantee about future usage or billing changes |

The owner selected a separate test project, rotation to v1, and revocation of
old plaintext keys only at a separately approved cutover. The analysis/search
deployment remains unknown; worker execution stays gated. No production data
or credentials were copied into the new project. Neither User-DB
`kohwfuxqbllsmvmsfqci` nor inactive Repo-DB `kiadrbqkkmncoblpcobo` was repurposed.

Read-only MCP catalog preflight confirmed Auth's `users`, `uid()` and `jwt()`;
the expected five platform roles; pgcrypto 1.3 in `extensions`; and uuid-ossp
1.1 in `extensions`. There were no public application relations, `sefgh_key_*`
RPCs, `sefgh_keys` schema or `sefgh_key_accountant` role. The migration list was
empty. No Auth user, key, usage, signing-key or configuration-secret value was
selected. This checks prerequisites/collisions, not hosted authorization.

Public Auth JWKS returned200 with one published ES256/EC signing key. Only
public algorithm/type metadata was inspected; no user token was issued. This
does not establish a trusted way to mint the accountant role or prove which
token a real user session receives. Provisioning remains gated.

## Concrete review bundle

Read [the SQL explanation and rollback boundary](keys-001-review.md) and the
[additive migration](../../supabase/migrations/20261021063751_keys_001_hashed_lifecycle.sql).
The migration creates six private tables and nine public RPC wrappers, with a
separate accountant role. It does not seed policy or modify legacy tables.
With no policy row, issuance/admission fail closed.

SHA-256 of the exact reviewed working-tree file bytes at this checkpoint:

| File | SHA-256 |
|---|---|
| `supabase/migrations/20261021063751_keys_001_hashed_lifecycle.sql` | `ce091529781d5a6522431cef4bcbaca6540f04d16383d695fe7e9bc7aa16b211` |
| `supabase/checks/keys_001_verify.sql` | `6edae1b4c8ce713fd0182f2c46250e08fec7f8ab2dde3514cb9356ca92d5a2b6` |
| `supabase/proposals/keys_001_legacy_truncate.sql` | `6a01cb7e2493b42318c6ef6f9dbb248d7a67745b34a60ed7b217597532da8179` |

Native PostgreSQL fixture tests previously passed 120 assertions, including the
actual additive SQL; hosted CI run39609303873 passed on622f7c3. Those used
PostgreSQL17.6 fixtures, not this new hosted17.11 database. The new project has
no legacy application tables, so it cannot establish the production legacy
TRUNCATE hardening result. R143's separate privilege proposal remains its own
review/apply decision. It is not bundled into approval of the additive SQL.

## Apply receipt and remaining execution gates

The owner explicitly approved this additive migration for the development
reference only. The exact file hash above was rechecked; the immediate
preflight still had no collisions. MCP `apply_migration` returned success.
`list_migrations` records hosted version `20261021174847`, name
`keys_001_hashed_lifecycle`. The hosted tool assigned this version; the reviewed
source filename remains `20261021063751_keys_001_hashed_lifecycle.sql`. Do not
rename or reapply it to make those timestamps equal.

All six committed post-apply verification queries ran read-only, followed by
a deployed-body/policy-count check. [Catalog receipt](keys-staging-catalog-2026-10-21.json)
records 24 denied direct-table privilege checks with RLS enabled, nine invoker
wrappers with the expected three-owner/six-accountant split, and all23deployed
function bodies matching the reviewed SQL after line-ending/edge-whitespace
normalization. The accountant is NOLOGIN/NOINHERIT/NOBYPASSRLS, owns no unrelated
data privilege among the inspected relations. The accountant-callable function
query returned only its six public wrappers among the inspected non-system
schemas; system schemas and procedures were outside that query. Authenticator
membership permits SET but not inherited privileges; the
platform also records a postgres membership without INHERIT/SET. Policy has
zero rows. These are catalog results, not a JWT or effective gateway test.

1. **Additive development SQL gate complete.** Exact owner approval, apply and
   catalog/definition receipt are recorded above. This grants no production or
   legacy privilege approval. Do not seed policy or reapply this migration.
2. **Provision the narrow accountant capability through an approved path.**
   Verify actual signing-key mode, trusted provisioning, rotation/expiry and
   gateway role selection. Do not paste signing secrets into chat/handoffs,
   mint an unreviewed JWT, change user Auth hooks, or use service-role CRUD.
   Audit unrelated effective privileges as well as key-object grants.
3. **Approve an explicit test policy and two isolated test identities.**
   Numeric test values must be recorded as test-only, not production defaults.
   Keep all existing app environment files and production projects untouched.
   Test provisioning/session credentials belong outside Git and logs.
4. **Run actual gateway acceptance**, separately as anonymous, userA, userB and
   accountant. Verify owner create/list/revoke and cross-user denial; no secret
   on list; accountant denial of management/unrelated data; user/anon denial of
   accounting/private tables; expiry/revocation; concurrent key/owner admission;
   exact completion replay and conflicting receipt denial. Confirm show-once
   responses and redacted failures. Native SET ROLE tests do not replace these.
5. **Complete operational/runtime acceptance before rollout.** Decide approved
   policy/expiry/retention, saved-receipt recovery cadence and unknown-outcome
   handling. Test preview forwarding, real show-once UI, no browser usage writes,
   failures, code rollback and disabled admissions with recovery still usable.
   Register/enable only under a separate approved rollout task. Do not call
   providers, run analysis workers or use production data to prove this gate.

## Receipt recovery and rotation

KEYS-GATEWAY-001a checked the actual development gateway using an existing
enabled modern publishable key, with no user Authorization header. All nine
key RPCs refused anonymous calls with HTTP401 / PostgreSQL42501. A limit0
private-profile request refused exposure with HTTP406 / PGRST106. Only fixed
test inputs and status/code were recorded; no key value or response payload was
persisted. Read-only counts afterward show policy/keys/events/recovery allzero.
The [anonymous receipt](keys-staging-anonymous-2026-10-21.json) is negative
gateway evidence, not a userA/userB/accountant test or authorization to provision
credentials, seed policy or enable runtime.

`apikey.RecoverCompletionPage` is implemented as an unregistered package helper.
Each invocation accepts an explicit1..100 row cap and a positive budget no more
than30seconds, validates one whole pending page before writes, and replays only
exact saved completions. A missing receipt stays unknown/pending and consumes
the scan budget. Failure stops before advancing past its row; adapter error
payloads are not returned. Cursors belong to one scan; later fresh scans start
at nil to revisit earlier unknown rows. No scheduler, retention deletion,
automatic abandonment, quota reservation or provider replay is included.

`OpenAccounting` currently requires an enabled admission policy. Recovery itself
uses only `Pending` and `Complete`; decide how a verified recovery capability
will be opened while admissions are disabled before runtime wiring. Do not
solve this by broadening credentials or quietly enabling admissions.

Rotation means users create new v1 credentials and update identified consumers.
Do not convert old plaintext credentials, dual-write secrets, revoke old keys,
or retire the legacy route/UI during this preparation. Inventory actual
consumers without copying key values, then present a concrete preview/rollback
and revocation task for owner approval. A code rollback retains the hashed
schema, metadata and audit/recovery records; it never restores plaintext or
repeats provider work. R039 remains open until the full supported lifecycle is
verified and live. The original-route count remains23/25.
