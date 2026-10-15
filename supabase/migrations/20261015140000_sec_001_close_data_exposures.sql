-- SEC-001: close the data exposures found in the review of User-DB on
-- 2026-10-15. The findings are in docs/database/user-db.md and in
-- docs/bug-register.md, R-070 to R-074.
--
-- Order matters. Deploy the app change that names its profile columns first:
-- once section 1 runs, every select('*') on profiles is refused.
-- supabase/checks/sec_001_verify.sql confirms the result (read-only), and
-- supabase/checks/sec_001_rollback.sql undoes it.
--
-- The statements do not use "if exists": they were written against the live
-- definitions, so if one is missing the database has changed and the whole
-- migration should stop.

-- 1. Email addresses (R-070). profiles is readable by everyone, including
--    signed-out visitors, and it holds every user's email. Browsers may now
--    read every column except email; a user's own address comes from
--    Supabase Auth. A column grant does not narrow a table grant, so the
--    table grant is revoked first. The list must match PROFILE_COLUMNS in
--    src/lib/supabase/profile-columns.js; a contract test compares them.
revoke select on table public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, bio, website, created_at, updated_at)
  on table public.profiles to anon, authenticated;

-- 2. Reading anyone's activity (R-071). These two functions run with the
--    owner's rights and take any user's id. Nothing in the app calls them;
--    /api/activity reads activity_logs as the signed-in user.
revoke execute on function public.get_user_activity_heatmap(uuid, integer) from public, anon, authenticated;
revoke execute on function public.get_user_activity_stats(uuid, integer) from public, anon, authenticated;
alter function public.get_user_activity_heatmap(uuid, integer) set search_path = '';
alter function public.get_user_activity_stats(uuid, integer) set search_path = '';

-- 3. Writing anyone's activity (R-072). log_user_activity wrote a row for
--    whatever user id it was given, even without signing in. It now runs
--    with the caller's rights, so the row-level rules on activity_logs (own
--    rows only) apply, and it refuses any id but the caller's.
--    src/lib/activity-logger.js already sends the caller's own id.
create or replace function public.log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'activity can only be logged for the signed-in user'
      using errcode = '42501';
  end if;

  insert into public.activity_logs as logs
    (user_id, activity_type, activity_date, activity_count, metadata)
  values (p_user_id, p_activity_type, current_date, 1, p_metadata)
  on conflict (user_id, activity_type, activity_date)
  do update set
    activity_count = logs.activity_count + 1,
    metadata = p_metadata,
    updated_at = now();
end;
$$;
revoke execute on function public.log_user_activity(uuid, text, jsonb) from public, anon;
grant execute on function public.log_user_activity(uuid, text, jsonb) to authenticated;

-- 4. Rewriting trending (R-073). Any signed-in account could insert, change
--    or delete the rows that /trending shows every visitor. The app never
--    writes them as a signed-in user; the refresh job is the only writer.
drop policy "Authenticated users can insert trending repos" on public.trending_repos;
drop policy "Authenticated users can update trending repos" on public.trending_repos;
drop policy "Authenticated users can delete trending repos" on public.trending_repos;

-- 5. Other functions that run with the owner's rights (R-074).
--    increment_platform_stat: called after a signed-in user's search is saved.
revoke execute on function public.increment_platform_stat(text) from public, anon;
grant execute on function public.increment_platform_stat(text) to authenticated;
alter function public.increment_platform_stat(text) set search_path = '';
--    increment_category_usage: nothing calls it.
revoke execute on function public.increment_category_usage(text) from public, anon, authenticated;
alter function public.increment_category_usage(text) set search_path = '';
--    upsert_shared_conversation: the share route and src/lib/supabase/shares.js
--    call it as a signed-in user.
revoke execute on function public.upsert_shared_conversation(uuid, boolean, text, text, jsonb) from public, anon;
grant execute on function public.upsert_shared_conversation(uuid, boolean, text, text, jsonb) to authenticated;
alter function public.upsert_shared_conversation(uuid, boolean, text, text, jsonb) set search_path = '';
--    Trigger functions on auth.users. A trigger fires without its function's
--    EXECUTE privilege, so nobody needs to call these directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_update() from public, anon, authenticated;
revoke execute on function public.create_user_stats_on_signup() from public, anon, authenticated;
alter function public.handle_new_user() set search_path = '';
alter function public.handle_user_update() set search_path = '';
alter function public.create_user_stats_on_signup() set search_path = '';
