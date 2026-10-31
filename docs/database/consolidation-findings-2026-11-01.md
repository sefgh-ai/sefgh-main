# Database consolidation: verified destination findings

DB-CONSOLIDATE-002. Read-only catalog observations on 2026-11-01 Asia/Calcutta
(database timestamp2026-10-31T23:27:18Z). Organization sefgh-ai's,
hithuduntbsajjhmnntm verified through connected Supabase; plan free.

## Destination User-DB kohwfuxqbllsmvmsfqci

Active/healthy at identity check. Metadata inventory succeeded in a read-only
transaction with timeouts. Public contains29tables and4views; all29tables have
RLS enabled. No corpus schema exists. Installed vector extension0.8.0; column
definitions refer to public.vector. pg_database_size reported19,328,147bytes;
32tables including three backup tables allocate3,932,160bytes in total. These
figures measure different scopes, not remaining billing quota or logical-copy
size. Table row estimates are often unknown/stale, not exact counts.

| Objects | Verified observation | Preservation rule |
|---|---|---|
| public.repo_embeddings | embedding is vector(1536); metadata and index allocation exist | Do not replace with or mix proposed768-dimensional corpus space; establish model/provenance and consumers before any migration |
| public.repo_comments and public.repository_comments | Different columns; repository_comments has a reply-notification trigger and references user identities | Similar names do not establish redundant data; preserve both |
| public.repo_votes, public.repo_ratings, public.repository_votes | Votes and ratings have distinct shapes/constraints | No blind rename, merge or deduplication |
| public.profiles | Two enabled timestamp triggers target different functions; email SELECT denied to anon/authenticated in current column-grant check | Preserve column-specific privileges and both triggers until full definition review; duplicate-looking names alone are not a bug |
| public.repo_*_stats views | Four views depend on corresponding repo_collections/comments/ratings/votes tables | Preserve dependent names and query behavior |
| r078_backup | Contains repository_bookmarks, repository_shares, user-data | Existing backup, not clutter to delete; keep protected and separate from new corpus |
| repository_cache and old repository_* tables | Read grants exist for anon/authenticated; actual rows/access still depend on policies | Grants do not prove current use or unrestricted visibility; no removal based on names/estimates |

Catalog evidence: [inventory](consolidation-user-inventory-2026-11-01.json),
[read grants](consolidation-user-grants-2026-11-01.json),
[capacity](consolidation-user-capacity-2026-11-01.json).
Queries are versioned under supabase/checks/db_consolidation_001 through004.
No app rows, user emails, key values, function bodies or scheduler commands
were read. No schema, policy, role or row was changed.

## Resource actions and source gate

Repo-DB kiadrbqkkmncoblpcobo was verified INACTIVE. Owner approved its resume;
first request was refused at the two-active-free-project limit. Owner then
explicitly approved temporarily pausing only sefgh-migration-dev
mraglhrenqwadegvwxts and retrying source resume, preserving User-DB.
Pause request succeeded and dev became INACTIVE. Second source resume request
succeeded; source is COMING_UP at latest check. No project deleted/upgraded,
no charge accepted, no ingestion started. Do not auto-resume dev while it would
exceed the same limit; key/signing development acceptance is unavailable during
this owner-approved pause. Existing signing approvals are otherwise unchanged.

No source schema/data has been read yet. The exact transfer manifest and
additive migration must wait for source readiness; do not infer source tables
from the old Python code or target names. The target application objects above
stay in place. Only independently verified source application data is eligible
for the reviewed corpus mapping. Source remains intact through reconciliation
and observation; no deletion is authorized by this inventory task.


Update DB-CONSOLIDATE-003: source is now ACTIVE_HEALTHY, metadata/counts read successfully; prior COMING_UP/query-refusal was transitional. Empty restricted User-DB corpus namespace applied/verified; see user-db-organization-2026-11-01.md for current dispositions and source manifest. No row transfer performed.
