# User-DB organization: applied foundation and cleanup map

DB-CONSOLIDATE-003, 2026-11-01. Owner requests useful User-DB work while source
starts; preserve existing app behavior/data and organize corpus separately.

## Applied to User-DB

Created empty corpus schema, owned by postgres. PUBLIC, anon, authenticated and
service_role receive neither USAGE nor CREATE. No API schema setting changed,
no table copied/moved/renamed, no app data written, no role/credential created.
Independent read-only SQL review found no material namespace blockers.

Supabase migration: corpus_001_restricted_namespace, version20261031233939.
[Apply/verify receipt](corpus-namespace-applied-2026-11-01.json) records exact
file hash, all six effective denial checks, zero relations/routines and equal
before/after application-catalog fingerprints. The fingerprints cover public/
r078_backup columns, relations, routines, policies, triggers and all default
ACLs; they are not row-data or browser parity tests. Routine bodies were hashed
inside the database, not copied to tool output or files.

The [manual rollback](../../supabase/checks/corpus_001_namespace_rollback.sql)
requires the exact marker and empty catalogs, then DROP SCHEMA RESTRICT. Never
CASCADE. It was independently source-reviewed, not executed against live User-DB.
No local PostgreSQL runtime was available (Docker daemon stopped, no psql found).
Remote apply and post-apply verification succeeded; no local test pass is claimed.

## Existing objects: reviewed dispositions

| Group | Current disposition | Evidence needed before changing it |
|---|---|---|
| Application tables and four stats views | Keep existing names, schema, APIs and policies | Owner R-079 accepts owner-rights views to retain global per-repository counts; do not blindly switch them to invoker |
| repo_embeddings | Keep vector(1536) and existing consumers | Provenance, exact types/RPC consumers, data checks before any separate model/index migration |
| repo_* versus repository_* tables | Preserve both families | Full definition/data/consumer dependency comparison; name similarity is insufficient |
| profiles timestamp triggers | Both retained | Functions differ; prove behavioral equivalence and dependencies before removing one |
| r078_backup | Keep protected backup schema | Existing R-078 migration/rollback depends on it; no cosmetic deletion |
| Fourteen mutable-search-path functions | Inventory/hardening candidates, not changed | Catalog confirms all14 are SECURITY INVOKER; inspect exact bodies, resolve unqualified dependencies and regression-test before fixed-path changes |
| vector extension in public | Retained | Existing types include public.vector; moving the extension is a separate compatibility migration |
| Leaked-password protection | Existing R-080 owner deferment retained | Free-plan decision unchanged; no paid upgrade authorized |
| GraphQL discovery advisories | Recorded as discovery warnings | Catalog visibility is not proof of readable user rows; maintain column privileges/RLS rather than revoking every app grant |

The advisor's no-policy messages for r078_backup are consistent with deliberately
inaccessible backup tables. Advisor warnings were not bulk-applied as SQL fixes.
Read-grant inspection confirms profiles.email remains denied to anon/authenticated.

## Source readiness and preliminary manifest

Repo-DB is now ACTIVE_HEALTHY after the owner-approved development-project pause.
Its [metadata/count receipt](consolidation-source-inventory-2026-11-01.json)
contains10public tables and42,044,563 database bytes. Exact counts at observation:

| Source table | Exact rows | Mapping disposition |
|---|---:|---|
| ReposMeta | 12030 | Preserve full legacy record/IDs before canonical transformation |
| ReposMeta-Research | 15414 | Separate research dataset; do not merge by name or assumed identity |
| api_key_usage_log | 147 | Operational history, potentially sensitive free text; secure transfer review |
| error_events | 14 | Operational history; do not publish payloads |
| repo_analysis | 165 | Preserve both768-dimensional embedding columns and unbounded repo2vec separately with provenance |
| repo_chunks | 0 | Empty now; preserve schema/dependencies in manifest |
| repositories_search | 0 | Empty now; inspect generated/search maintenance dependencies |
| session_snapshots | 33 | Includes api_keys JSON column; values not inspected or exported; treat as sensitive until reviewed |
| topic_list | 37 | Durable input/state requires exact cursor/status mapping |
| topic_processing_history | 33 | Preserve history and timestamps |

No public.repositories table appears in the actual source inventory. Do not run
the compatibility RepoSync worker against this database by guessing a table
mapping. No ingestion/analyser was started. Zero ReposMeta rows have is_private
true at the count observation; that is not proof that logs/research contain no
sensitive material. Counts are not a backup, identity proof or copy validation.

R-210 records nine source non-RLS tables granting anon/authenticated writes.
Narrow source-write containment is separately reviewed/proposed and awaits an
owner decision; it is not part of the applied User-DB namespace migration.
No source DDL/DML/data transfer performed by this task.

Next: exact source types/constraints/indexes/policies/trigger/RPC dependency
manifest, secure backup/restore and transfer channel, then additive corpus-table
proposal. Do not import legacy broad grants or mix embedding spaces. Review
scoped worker capability before enabling any writer in User-DB.


BUG-070/R-210 follow-up: owner approved source-only write restriction; migration20261031234604 applied and all9effective table/column denial checks passed with reads/serviceCRUD preserved. Ten source counts and excluded researchACL unchanged. See reposync-public-writes-blocked-2026-11-01.json. Source dependencies now mapped:24constraints,52indexes,12publicroutines and3enabled triggers; one topic webhook has nonempty arguments, which were not fetched. repo_analysis references ReposMeta.id, while repositories_search references ReposMeta.repo_id; preserve both identities. No source-data transfer or webhook recreation.
