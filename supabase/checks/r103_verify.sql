-- Read-only. Confirms that
-- supabase/migrations/20261028120100_r103_user_stats_server_only.sql is in
-- effect. Every row must say ok = true.
with stats_policies as (
  select policyname, roles, cmd, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies
  where schemaname = 'public' and tablename = 'user_stats'
)
select check_name, ok from (values
  ('nobody can change or delete stats through the API',
    not exists (select 1 from stats_policies where cmd in ('UPDATE', 'DELETE', 'ALL'))),
  ('one insert policy, for signed-in users only',
    (select count(*) = 1 from stats_policies where cmd = 'INSERT')
    and not exists (select 1 from stats_policies where cmd = 'INSERT' and roles <> array['authenticated']::name[])),
  ('an insert is limited to the user''s own empty row',
    exists (select 1 from stats_policies where cmd = 'INSERT'
      and with_check like '%auth.uid()%' and with_check like '%(level = 1)%'
      and with_check like '%(xp = 0)%' and with_check like '%(followers = 0)%')),
  ('everyone can still read stats',
    exists (select 1 from stats_policies where cmd = 'SELECT' and qual = 'true')),
  ('row level security is on',
    (select relrowsecurity from pg_class where oid = 'public.user_stats'::regclass))
) as checks(check_name, ok);
