-- R-103: any signed-in user could set their own level, title, XP, followers
-- and other stats, which everyone may read. The owner chose option A on
-- 2026-10-28: users may only create their own empty row; stats change only
-- on the server.
--
-- Live definitions, read on 2026-10-28 (docs/database/user-db.md): 22 rows,
-- none with a value other than its column default, so nothing a user wrote is
-- lost. 11 of 33 users have no row: on_auth_user_created_stats creates one at
-- sign-up, but older accounts get theirs from the browser (useUserStats
-- inserts { user_id } when none exists), so that insert stays allowed.
--
-- No app change is needed first: nothing calls the hook's updateStats or
-- incrementStat, and the Go data proxy already refuses updates of user_stats
-- (DATA-PROXY-001). The service role and security-definer functions, such as
-- the sign-up trigger, are not subject to these policies.
--
-- supabase/checks/r103_verify.sql confirms the result (read-only), and
-- supabase/checks/r103_rollback.sql undoes it. No "if exists", as in R-078.

drop policy "Users can update their own stats" on public.user_stats;
drop policy "Users can insert their own stats" on public.user_stats;

-- The values are the column defaults; change both together.
create policy "Users can create their own empty stats"
  on public.user_stats for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and level = 1 and title = 'Newbie' and xp = 0 and xp_to_next_level = 100
    and contributions = 0 and contributions_max = 64
    and followers = 0 and following = 0 and projects = 0
  );
