-- Undoes supabase/migrations/20261028120100_r103_user_stats_server_only.sql,
-- restoring the definitions read on 2026-10-28, exposure (R-103) included.
-- Run it only to recover from a fault the migration caused, and only with the
-- owner's approval.
drop policy "Users can create their own empty stats" on public.user_stats;
create policy "Users can insert their own stats" on public.user_stats
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own stats" on public.user_stats
  for update using (auth.uid() = user_id);
