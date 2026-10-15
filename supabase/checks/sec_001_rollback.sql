-- Undoes supabase/migrations/20261015140000_sec_001_close_data_exposures.sql,
-- restoring the definitions recorded on 2026-10-15, exposures included. Run
-- it only to recover from a fault the migration caused, and only with the
-- owner's approval. Each section can be run alone.

-- 1. profiles: every column readable again, email included.
revoke select (id, full_name, avatar_url, bio, website, created_at, updated_at)
  on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;

-- 2. Activity read functions.
grant execute on function public.get_user_activity_heatmap(uuid, integer) to public, anon, authenticated;
grant execute on function public.get_user_activity_stats(uuid, integer) to public, anon, authenticated;
alter function public.get_user_activity_heatmap(uuid, integer) reset search_path;
alter function public.get_user_activity_stats(uuid, integer) reset search_path;

-- 3. log_user_activity as it was.
create or replace function public.log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.activity_logs (user_id, activity_type, activity_date, activity_count, metadata)
  values (p_user_id, p_activity_type, current_date, 1, p_metadata)
  on conflict (user_id, activity_type, activity_date)
  do update set
    activity_count = activity_logs.activity_count + 1,
    metadata = p_metadata,
    updated_at = now();
end;
$$;
alter function public.log_user_activity(uuid, text, jsonb) reset search_path;
grant execute on function public.log_user_activity(uuid, text, jsonb) to public, anon, authenticated;

-- 4. trending_repos write policies for every signed-in account.
create policy "Authenticated users can insert trending repos" on public.trending_repos
  for insert to authenticated with check (true);
create policy "Authenticated users can update trending repos" on public.trending_repos
  for update to authenticated using (true);
create policy "Authenticated users can delete trending repos" on public.trending_repos
  for delete to authenticated using (true);

-- 5. Other owner-rights functions.
grant execute on function public.increment_platform_stat(text) to public, anon, authenticated;
grant execute on function public.increment_category_usage(text) to public, anon, authenticated;
grant execute on function public.upsert_shared_conversation(uuid, boolean, text, text, jsonb) to public, anon, authenticated;
grant execute on function public.handle_new_user() to public, anon, authenticated;
grant execute on function public.handle_user_update() to public, anon, authenticated;
grant execute on function public.create_user_stats_on_signup() to public, anon, authenticated;
alter function public.increment_platform_stat(text) reset search_path;
alter function public.increment_category_usage(text) reset search_path;
alter function public.upsert_shared_conversation(uuid, boolean, text, text, jsonb) reset search_path;
alter function public.handle_new_user() reset search_path;
alter function public.handle_user_update() reset search_path;
alter function public.create_user_stats_on_signup() reset search_path;
