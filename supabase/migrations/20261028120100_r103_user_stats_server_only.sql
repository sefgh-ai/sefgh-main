-- R-103: any signed-in user could set their own level, title, XP, followers
-- and other stats, which everyone may read. The owner chose on 2026-10-28:
-- users write nothing in user_stats; the server creates every row and is the
-- only one to change it.
--
-- Live definitions, read on 2026-10-28 (docs/database/user-db.md): 22 rows,
-- none with a value other than its column default, so nothing is lost. 11 of
-- 33 users had no row: on_auth_user_created_stats (security definer) creates
-- one at sign-up, but it came later, and older accounts got theirs from the
-- browser. This migration creates the missing rows itself; useUserStats no
-- longer inserts, and shows the defaults if a row is ever missing.
--
-- The service role and security-definer functions, such as the sign-up
-- trigger, are not subject to these policies. The Go data proxy allows only
-- reads of user_stats.
--
-- supabase/checks/r103_verify.sql confirms the result (read-only), and
-- supabase/checks/r103_rollback.sql undoes it. No "if exists", as in R-078.

-- 1. Every existing user gets the row the sign-up trigger gives new ones.
insert into public.user_stats (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- 2. Users can no longer write their stats. Reads are unchanged.
drop policy "Users can update their own stats" on public.user_stats;
drop policy "Users can insert their own stats" on public.user_stats;
