# RepoSync to Discover: implementation readiness

DB-CONSOLIDATE-001 owner update2026-11-01: Repo-DB application objects/data are to consolidate into corpus schema inside User-DB while preserving existing app behavior/data. This supersedes separate-project assumptions. Worker needs corpus-only capability, never User-DB service-role key. Live identity/inventory, backup/restore, reviewed additive scripts, reconciliation and rollback remain required; no transfer or cleanup executed. See docs/plans/database-consolidation.md.


REPOSYNC-002a, 2026-11-01. Owner requested continuing item 5 (RepoSync).
This is an execution sequence for the accepted architecture, not a new live
worker approval. No database has been queried or modified by this task.

## Decisions already made

ADR-0002 records the owner's 2026-10-28 acceptance of HLD D1-D8. Use a separate
Corpus DB, preferably the existing Repo-DB after inspecting it; durable jobs;
pg_cron-driven bounded Go ticks; small initial corpus; no LLM summaries in v1.
Discover replaces RepoSync and splits oversized GitHub searches by creation
date and then stars. Do not ask the owner the general split-or-cap question
again: this direction is decided. Exact initial topics, star floor, history
range and storage budget still need concrete rollout values.

The legacy worker remains a version-1 compatibility reference. Preserve its
fixtures and deliberate defects until an approved replacement/cutover; do not
run it to discover which database it writes to. Its environment is not evidence
of an authorized target. No new key, database, scheduler or service is needed
for the local planning and pure-code stages below.

## First hosted dependency: identify and inventory the intended database

Confirm the organization, project name and project reference from an existing
authorized connection or dashboard. Repo-DB is a historical label, not a unique
project identifier. Do not substitute User-DB or sefgh-migration-dev. If paused,
restoring the project is a separate resource action; a catalog read does not
authorize it. No Supabase query connector is exposed in this session, browser
access was unavailable at the latest checkpoint, and no psql executable was
found. Do not seek passwords or use unrelated connected databases.

The ready-to-review first pass is
[`corpus_001_inventory.sql`](../../supabase/checks/corpus_001_inventory.sql).
It runs catalog reads in a bounded read-only transaction, returns one JSON
value and rolls back. It reads no application rows and emits no function
bodies, defaults, policy expressions, scheduler commands or settings containing
credentials. It covers relations in public/corpus, column types, RLS flags,
names of policies/constraints/triggers and relevant installed extensions.
Estimated row counts may be null or stale; they do not identify an active corpus.

Record a secret-free receipt with independent project identity, UTC observation
time, script SHA-256, success/failure and reviewed output. This is only an
inventory. Follow with separately scoped reads of exact grants, key/foreign-key
definitions, relevant policy and trigger logic, RPC definitions, indexes and
exposed schemas. Review definitions privately before retaining them: SQL bodies
can contain secrets. Never dump scheduler commands or all database functions.
Deployment records must separately establish which worker is running and
whether any transfer from repositories to ReposMeta exists.

## Bounded implementation sequence

| Task | Concrete result | Evidence before moving on |
|---|---|---|
| REPOSYNC-002a | This preflight and sequence | References/diff checks, existing worker baseline, normal handoff; hosted inventory explicitly pending |
| REPOSYNC-002b | Implemented locally: pure Go search-slice planner with no network/database dependency | Local cases prove disjoint complete date/star splits, inclusive boundary handling, leap days, invalid ranges and terminal unsplittable slices; overflow must never be reported complete |
| REPOSYNC-002c | Reviewed corpus/jobs migration proposal based on actual inventory | Exact grants/RLS and atomic fenced claim/checkpoint/output/completion tests on an approved disposable database; no production apply implied |
| REPOSYNC-002d | Bounded Discover executor with injected GitHub and job-store interfaces | Local fakes cover token exhaustion, retry-after, partial GraphQL replies, page failure, cursor resume, duplicate/retry distinction, restart and cancellation |
| REPOSYNC-002e | Default-off CLI/tick integration and scoped configuration | Authenticated tick, body/time bounds, credential separation, no work when disabled; no actual cron installation |
| REPOSYNC-002f | Hosted small-scope acceptance and approved replacement | Exact project/scope/budget approval, no dual writers, restart/lease fencing proof, rollback and deployment receipt |

REPOSYNC-002b now has an offline planner in backend/internal/discover, with
local tests and lesson48. It does not construct queries, fetch pages or mark
jobs complete. Names after 002b are proposed tasks, not implemented stages.
Pure planner work can proceed while the inventory is pending. Database adapters,
schema changes and live execution must use verified definitions. New Go code
ships with a lesson and regression checks; existing exercise.go stays untouched.

## Defects and replacement acceptance

R-189/R-190: token rotation must not reset exponential backoff, and exhausting
all tokens must yield a bounded wait/retry outcome rather than a crash.
R-191: restart must reclaim only expired leases with fencing; a stale worker
must not checkpoint or complete a newer owner's job.
R-192: request actual GraphQL cost and record measured usage, not invented cost.
R-193: only a fully enumerated slice can complete; split above the search cap.
If a one-day/equal-star slice remains too large, stop with an explicit blocked
outcome until an additional partition strategy is reviewed.
R-194/R-195 and R-118: preserve cursor/progress across page failure, handle
partial replies explicitly, and distinguish existing rows from failed writes.
R-196-R-198: carry the original register's input, monitoring and metric cases
into the replacement regression set; do not close them merely from this plan.

Output upsert, next-stage enqueue and cursor advance must have a reviewed atomic
boundary. Replay after a crash must neither skip repositories nor double-count
completion. A lease token must be checked in every state-changing RPC, not only
at initial claim. Worker credentials are Corpus-DB-only; User-DB stays separate.

## References and verification limits

Accepted direction: [ADR-0002](../adr/0002-go-backend.md),
[HLD sections 4.4 and 12](../architecture/hld.md),
[LLD corpus/jobs design](../architecture/lld.md).
Legacy evidence: [RepoSync contract](../../contracts/reposync/README.md).
Related later stages: [analysis/search plan](analysis-search-workers.md).

The read-only transaction and catalog fields were checked against PostgreSQL's
[SET TRANSACTION](https://www.postgresql.org/docs/current/sql-set-transaction.html)
and [pg_class](https://www.postgresql.org/docs/current/catalog-pg-class.html)
documentation. The Supabase changelog index fetch returned unsupported markdown
content type; no Supabase feature/API change is introduced by this packet.
SQL was source-reviewed, not executed or parser-validated against PostgreSQL.
This packet establishes no live schema, permissions, row counts or worker state.

## Local evidence

Initial tests failed because planner symbols did not exist. Final focused `go test -count=1 ./internal/discover ./internal/reposync ./cmd/reposync` and corresponding vet passed. Four planner tests include499 date ranges and390 star ranges, exact1000/1001 boundaries, leap dates, invalid/incomplete observations, pointer independence and extreme dates/int64 bounds. Deliberate breaks admitting1001 and overlapping adjacent dates failed the expected tests; source restored exactly (SHA25695be268977534d2fb95707a67ef6d8583e5e2d81f3417a7c80f86389a0263aa2). Independent read-only review by review_discover found no material correctness/safety issue; its stale future-task wording finding was corrected. Review did not execute SQL or inspect live/executor state. Inventory SHA25621884ad79b607f184799b138e4a8195ae3962e0e72b4b51c1735c4851a44399f. Lessons generated; checks skipped by policy; existing exercises untouched.
