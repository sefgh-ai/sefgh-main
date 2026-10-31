# Repo-DB into User-DB: consolidation and organization

DB-CONSOLIDATE-003 (2026-11-01): User-DB now has an empty restricted corpus schema, migration corpus_001_restricted_namespace/version20261031233939. Ownerpostgres; anon/authenticated/service_role have no USAGE/CREATE; no API exposure change. Six before/after app catalog fingerprints match. Existing tables/data/policies/roles unchanged. Repo-DB now healthy and metadata/count inventory saved; source transfer not performed. R-210 source public-write grants recorded; separate reviewed containment proposal awaiting owner decision. See docs/database/user-db-organization-2026-11-01.md and the namespace/source receipts.


DB-CONSOLIDATE-001, 2026-11-01. Owner direction: shift Repo-DB into User-DB.
Owner cleanup choice: organize corpus tables in a separate schema inside
User-DB, preserving existing data and app behavior. This supersedes HLD D1's
separate-project direction. Live transfer is pending verified inventory/access.

## Identity and preservation

| Purpose | Historical reference | Current verification |
|---|---|---|
| Source Repo-DB | kiadrbqkkmncoblpcobo | Previously inactive; current status/contents unverified |
| Destination User-DB | kohwfuxqbllsmvmsfqci | Website database; refresh schema/dependencies/capacity |
| Organization | sefgh-ai's / hithuduntbsajjhmnntm | Historical; verify through the connected account |

Put repository catalog, discovery jobs and future embeddings under `corpus` in
User-DB. Keep existing app tables, names, APIs and data in place. Account for
every source application object/data in the manifest, including custom schemas.
Do not blindly restore the source over the destination. Auth, Storage, Realtime,
Vault, roles and managed schemas are not copied wholesale. If application rows
depend on source Auth identities or Storage objects, inventory and explicitly
map those dependencies; never discard them or overwrite destination platform data.
Unknown objects stay unclassified, not assumed unused. Source deletion and
application-table renaming are outside this initial organization scope.

## Required credential redesign

The old proposal could use the Corpus project's service-role key because it
contained no user data. That separation disappears. Do not give the ingestion
worker User-DB's service-role key: a separate schema alone cannot constrain a
project-wide credential. Design a corpus-only role/capability with explicit
schema/table/sequence/RPC grants, no escalation, no user-table privileges and
no bypass-RLS. Verify inherited and PUBLIC privileges and callable definer
functions, not only direct grants. No credentials are minted by this plan.

Application requests retain user-scoped authorization. Public corpus search
gets only an explicitly reviewed read-only entry point. Do not expose all
corpus tables or copy broad grants from examples. Select the PostgREST role/JWT
or narrow database interface after actual role/grant inspection. Existing
signing approval does not authorize a new worker credential.

## Ordered implementation and acceptance

1. Connect the intended Supabase account and independently confirm both projects.
   Resuming a paused source needs its own concrete resource decision first.
2. Run [metadata inventory](../../supabase/checks/db_consolidation_001_inventory.sql)
   separately against confirmed source and destination. It uses a bounded
   read-only transaction and returns no app rows. Record public project identity,
   UTC time, script hash and reviewed output. Relation details cover public/corpus;
   examine schema_names for additional application schemas before a wider read.
3. Read scoped definitions for constraints, indexes, grants/default privileges,
   policies, triggers, RPCs, views and exposed schemas. Review bodies privately
   for embedded secrets. Identify consumers and active writers without dumping
   credential-bearing scheduler commands. Measure database/storage size, vector
   and index overhead and backup headroom; do not assume the combined data fits.
4. Produce the migration manifest: source object, target corpus object, types,
   keys/dependencies, exact counts, validation, transfer order, consumer,
   conflict rule and rollback. Investigate existing destination corpus-like
   tables such as repo_embeddings instead of overwriting them. Preserve separate
   embedding spaces/provenance; equal768 dimensions do not establish compatibility.
   Deduplication needs a defined identity/conflict rule preserving information.
5. Prepare additive schema/grant/transfer scripts and test on a disposable target.
   Obtain a recoverable backup and demonstrate restore before a live copy.
   Transfer through a reviewed secure channel, never chat/docs/fixtures. Preserve
   IDs, relationships, nulls, timestamps and sequence positions. Copy before
   changing consumers. Active writers require an explicit maintenance/final-delta
   boundary; do not introduce dual writes or accept unnoticed source drift.
6. Reconcile exact counts, key sets, canonicalized-record checksums, constraints,
   sequences and orphan checks. Counts alone are insufficient. Test signed-out
   and two-user isolation, corpus-worker denial against user tables, existing
   app flows and intended corpus readers. Measure performance/space before claims.
7. Review exact live apply/cutover scripts, project identities, backup/restore
   receipt, scoped credential plan and rollback. Consolidation direction is
   authorized; new credential/resource actions obey their actual access and
   authorization requirements. Change consumers in bounded reversible groups.
8. Preserve source through reconciliation and an agreed observation period.
   Decommission/removal is a separate concrete final decision.

Cleanup currently means organization, not deletion. Suspected unused/duplicate
objects get findings and dependency evidence first. No DROP CASCADE, truncation,
sequence reset, app-table rename or cosmetic VACUUM FULL is part of this plan.

## Skills, access and evidence

Installed the official `supabase-postgres-best-practices` version1.1.1 (MIT)
from [supabase/agent-skills](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices)
with the standard installer into
`C:/Users/Windows/.codex/skills/supabase-postgres-best-practices`.
The installed tree has36 Markdown instruction/reference files and no executable
scripts. Loaded SKILL and least-privilege references for this task. Automatic
discovery starts next turn; installation does not grant database permissions.
The initial git transport failed its local proxy connection; the normal
installer's archive download succeeded without bypassing a permission refusal.

Supabase integration was found but not installed/connected at the last check;
connection suggested. No SQL has run, no rows copied and no schema changed.
SQL is source-reviewed, not executed/parser-validated. No live schema or capacity
claim is made. The older Repo-DB-only inventory remains a historical artifact;
use the consolidation inventory for this new two-project preflight.

Guidance: [Supabase roles](https://supabase.com/docs/guides/database/postgres/roles),
[PostgreSQL transactions](https://www.postgresql.org/docs/current/sql-set-transaction.html).
The custom-schema documentation URL failed to load; no guessed API/configuration
was implemented. Existing offline Discover code is unchanged; live execution
remains disabled. The old separate-project/service-key assumptions in HLD/LLD
are historical and must not be used for new implementation.


BUG-070/R-210 (2026-11-01): exact owner-approved source Repo-DB write/admin grants revoked for PUBLIC/anon/authenticated on9non-RLS tables. All9effective table/column denial checks pass; current reads and service-roleCRUD preserved. Ten source counts and excluded researchACL unchanged. Migration20261031234604; receipt/verify/rollback versioned. No data copied/deleted or User-DB table changed; source read/RPC audit and transfer remain separate.
