# User-DB: live definitions (snapshot)

Read on 2026-10-15 by Claude Code (task SEC-001) from the Supabase project `kohwfuxqbllsmvmsfqci`, which the website and this checkout both use. The ID is public: it is in browser code. Postgres 17.6.

Everything here was read with catalog queries through the Supabase MCP connection, read-only. It records definitions, never data: the only figures are row counts. No email address, key or token is copied here.

This is a snapshot, not the source of truth. Most of the schema was made in the dashboard: the project's migration history holds only four migrations (2026-01-07 and 2026-01-08: `create_user_stats_table`, `create_search_history_table`, `create_platform_stats_table`, `create_increment_platform_stat_function`). Recheck the live definitions before relying on a detail; the queries are at the end.

Repo-DB, the second project (semantic search), has not been reviewed yet.

## What this settles

- **Phase 3 reads, ACT-002 and STAR-001.** `activity_logs` lets a user read only rows where `auth.uid() = user_id`, and `repo_collections` the same. Reading as the user with the public key, as both Go ports do, returns only the user's own rows. This is the policy evidence those two ports were waiting for. It is not a cutover approval.
- **R-064.** `activity_logs` is unique on `(user_id, activity_type, activity_date)`, so a user has at most one row per activity type per day. With 11 activity types in `src/lib/activity-logger.js`, a year can exceed the Data API's 1,000-row limit for a busy user. The risk is real; the entry stays open.
- **R-041.** The avatar Storage policies exist (below), so the missing setup file is no longer the only record of them.

## Exposures found

Each is a register entry. The first five were closed on 2026-10-15 (see "The fix"); the table describes the database as it was before.

| Entry | What anyone could do | Why |
|---|---|---|
| R-070 (High) | Read every user's email address without signing in: 32 of 32 profiles have one | `profiles` grants SELECT on every column to `anon` and `authenticated`, and the policy "Public profiles are viewable by everyone" is `using (true)`. The sign-up trigger copies each address into it |
| R-071 (High) | Read any user's activity history by user id, without signing in. User ids are public in `profiles` | `get_user_activity_heatmap` and `get_user_activity_stats` run with the owner's rights (SECURITY DEFINER) and take `p_user_id` from the caller |
| R-072 (High) | Add activity to any user's record, without signing in | `log_user_activity` runs with the owner's rights and writes for whatever `p_user_id` it is given |
| R-073 (High) | Any account, which anyone can make by signing up, can insert, change or delete the rows `/trending` shows every visitor | Three policies on `trending_repos` allow insert, update and delete `to authenticated` with `true` |
| R-074 (Medium) | Inflate the public search counter without signing in; call the other owner-rights functions | `increment_platform_stat`, `increment_category_usage`, `upsert_shared_conversation` and three trigger functions are executable by `anon`; no owner-rights function fixes its `search_path` |

Also recorded, not part of the fix:

- R-076: `/api/repo/vote` calls `get_repo_vote_stats`, which does not exist.
- R-075: comments and videos ask `profiles` for `username`, which does not exist (the column is `full_name`).
- R-077: the trending refresh writes with the public key and no session; only the service role may write `trending_repos`, so it cannot fill the table (0 rows).
- R-078: unused tables with loose or no rules. Read again on 2026-10-28 (OWNER-ANSWERS-003): rows 0 `repository_notifications`, 0 `repository_shares`, 1 `repository_bookmarks`, 1 `user-data`; `repository_notifications` is written by the trigger `trigger_reply_notification` (`AFTER INSERT` on `repository_comments`, `create_reply_notification()`, run as the caller), and `get_repository_stats(text)` reads bookmarks and shares. Prepared, not applied: `../../supabase/migrations/20261028120000_r078_drop_unused_tables.sql`.
- R-103: `user_stats` lets a user insert and update their own row. Read on 2026-10-28: 22 rows, all at the column defaults; 11 of 33 users have none; `on_auth_user_created_stats` (security definer) creates one at sign-up. Prepared, not applied: `../../supabase/migrations/20261028120100_r103_user_stats_server_only.sql`.
- R-079: the four stats views run with the owner's rights.
- R-080: leaked-password protection is off.
- Playground keys (R-039): `api_keys.key` holds the key itself; 3 rows. Row rules limit each user to their own keys.

## Tables

Row-level security is on for every table. "Own" means `auth.uid()` equals the row's user column. Policies apply to every role unless a role is named.

| Table | Read | Write | Notes |
|---|---|---|---|
| `activity_logs` | own | insert, update own | unique per user, type and day; 38 rows |
| `api_keys` | own | insert, update, delete own | key stored as written (R-039) |
| `api_limits`, `api_logs` | own | insert (and update for limits) own | |
| `categories` | `is_active` rows | insert if signed in; update own (`created_by`) | two identical update policies |
| `comment_votes`, `repo_votes`, `repo_ratings`, `repository_votes`, `repository_comment_votes` | everyone | own | |
| `notifications` | own | insert, update, delete own | |
| `onboarding_data`, `search_history`, `user_conversations`, `repo_collections` | own | own | |
| `platform_stats` | everyone | service role only | counters change through `increment_platform_stat` |
| `profiles` | everyone; since SEC-001 every column except `email` (R-070) | insert, update, delete own | duplicate insert, select and update policies; `id` references `auth.users` |
| `projects`, `repo_videos` | everyone | own (`uploaded_by` for videos) | |
| `repo_claims` | own, or `claim_status = 'verified'` | insert own | |
| `repo_comments` | not deleted, or own | own | |
| `repo_embeddings` | everyone | none | semantic search |
| `repo_submissions` | own | insert own | |
| `repository_bookmarks` | everyone (R-078) | insert, delete own | not used by this code; 1 row |
| `repository_cache` | everyone | service role | |
| `repository_comments` | everyone | own | not used by this code; a trigger notifies on replies |
| `repository_notifications` | own | insert: anyone, `with check (true)` (R-078) | not used by this code; 0 rows |
| `repository_shares` | everyone | insert: anyone, `with check (true)` (R-078) | not used by this code; 0 rows |
| `shared_conversations` | public and not deleted, or own | own | `conversation_id` and `created_by` required; 4 rows |
| `trending_repos` | everyone | service role only; until SEC-001 also `authenticated` (R-073) | 0 rows |
| `user_stats` | everyone | insert, update own | |
| `user-data` | nobody | nobody | no policies; not used by this code (R-078) |

Views `repo_collection_stats`, `repo_comment_stats`, `repo_rating_stats` and `repo_vote_stats` count per repository. They run with the owner's rights (R-079), so `repo_collection_stats` counts every user's saves although each user can read only their own.

Supabase's default grants apply: `anon` and `authenticated` hold every table privilege, and the policies decide. `profiles` is not in a Realtime publication, so `subscribeToProfile` in `src/lib/supabase/profiles.js` receives nothing.

## Functions in `public`

The `vector` extension's functions are left out.

| Function | Rights | Callable by | Used by |
|---|---|---|---|
| `log_user_activity(uuid, text, jsonb)` | owner (R-072) | everyone | `src/lib/activity-logger.js`, with the caller's own id |
| `get_user_activity_heatmap(uuid, integer)`, `get_user_activity_stats(uuid, integer)` | owner (R-071) | everyone | nothing |
| `increment_platform_stat(text)` | owner | everyone | `src/lib/supabase/search-history.js`, after a signed-in search is saved |
| `increment_category_usage(text)` | owner | everyone | nothing |
| `upsert_shared_conversation(uuid, boolean, text, text, jsonb)` | owner; writes only rows the caller owns | everyone | `/api/conversations/[id]/share`, `src/lib/supabase/shares.js` |
| `match_repo_embeddings(...)` | caller | everyone | semantic search |
| `get_repository_stats(text)`, `is_trending_data_stale()` | caller | everyone | |
| `get_repo_vote_stats` | does not exist (R-076) | | `/api/repo/vote` |

Triggers: on `auth.users`, `on_auth_user_created` (`handle_new_user`: creates the profile, copying the email), `on_auth_user_updated` (`handle_user_update`: copies email, name and avatar again) and `on_auth_user_created_stats` (`create_user_stats_on_signup`). All three run with the owner's rights. On `repository_comments`, `trigger_reply_notification` (`create_reply_notification`, caller's rights). The other trigger functions keep `updated_at` and counters current.

## Storage

Bucket `avatars`: anyone can read; a signed-in user can upload, update and delete only under a folder named with their own id (`storage.foldername(name)[1] = auth.uid()`). Every policy exists twice under two names.

**Changed 2026-10-24 (AVATAR-POLICY-002b, R-186):** signed-out callers can no longer read or list the bucket. A signed-in user reads only their own folder; avatar links still work because the bucket is public. The duplicate policies are gone. The summary above describes the database before that change.

This summary is not the exact policy text. The exact definitions, the bucket's settings (public, 5 MiB, four image types), what the upload route needs from each policy, and two findings (R-041 confirmed, R-186) are in [avatar-storage.md](avatar-storage.md), read 2026-10-23 (AVATAR-POLICY-001).

## Auth

32 users, none anonymous; the code never calls `signInAnonymously`. The security advisor reports leaked-password protection off (R-080); Supabase offers it only on the Pro plan.

## The fix (SEC-001)

- **App, safe before and after the database change.** Profile reads name their columns: `PROFILE_COLUMNS` in `src/lib/supabase/profile-columns.js`, used by `src/lib/supabase/profiles.js` and `src/hooks/profile/useProfileData.js`. The profile form takes the user's email from Supabase Auth. Guard: `scripts/contracts/profile-columns.test.mjs`.
- **Applied 2026-10-15** by the owner, in the Supabase SQL editor, after the app change was live on `sefgh-main`. The Supabase connector had declined both a dry run and `apply_migration`. Run that way, the migration is not in the project's migration history table. Afterwards `supabase/checks/sec_001_verify.sql` showed 13 of 13 true (Claude Code, read-only).
- **Database.** `supabase/migrations/20261015140000_sec_001_close_data_exposures.sql`. Read-only check afterwards: `supabase/checks/sec_001_verify.sql`, which must show 13 rows, all `ok`. Undo: `supabase/checks/sec_001_rollback.sql`.
- **Order.** Deploy the app change first: once the migration runs, `select('*')` on `profiles` is refused. The old live project `sefgh-ui` runs May 2026 code (R-066) against the same database and has not been checked; its profile and chat pages may stop loading their profile.
- **Dry run.** On 2026-10-15 the migration was run against a local Postgres 17.5 (PGlite) loaded with the definitions above: roles, `auth.uid()`, the affected tables, their policies, the function bodies and triggers, and Supabase's default grants. 17 checks passed:
  - before the migration, the stand-in reproduced R-070 to R-073;
  - afterwards, the verify file passed;
  - signed-out and signed-in reads of the public columns, profile and avatar updates, own-activity logging, the service role's trending write, the search counter and sharing all still worked;
  - sign-up and an email change still fired the triggers, without EXECUTE on them;
  - the rollback restored the old access, and the migration applied again after it.
  The stand-in and its script were scratch files and are not committed. Nothing was run against the live database except the read-only queries.

## Queries used

Run through the Supabase SQL editor or MCP. Each reads the catalog only.

```sql
-- Tables, row-level security and columns
select c.relname, c.relrowsecurity,
  (select string_agg(a.attname, ',' order by a.attnum) from pg_attribute a
   where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as columns
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') order by 1;

-- Policies
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname in ('public', 'storage') order by 1, 2, 4;

-- Functions: owner's rights, settings and who may run them
select p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';

-- A function's body
select pg_get_functiondef('public.log_user_activity(uuid, text, jsonb)'::regprocedure);
```
