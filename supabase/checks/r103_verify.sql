-- Read-only. Confirms that
-- supabase/migrations/20261028120100_r103_user_stats_server_only.sql is in
-- effect. Every row must say ok = true.
with stats_policies as (
  select policyname, cmd, coalesce(qual, '') as qual
  from pg_policies
  where schemaname = 'public' and tablename = 'user_stats'
)
select check_name, ok from (values
  ('nobody can create, change or delete stats through the API',
    not exists (select 1 from stats_policies where cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL'))),
  ('every user has a stats row',
    not exists (select 1 from auth.users u where not exists (select 1 from public.user_stats s where s.user_id = u.id))),
  ('new users get one at sign-up',
    exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_stats'
      and tgrelid = 'auth.users'::regclass and tgenabled = 'O')
    and coalesce((select prosecdef from pg_proc where oid = to_regprocedure('public.create_user_stats_on_signup()')), false)),
  ('everyone can still read stats',
    exists (select 1 from stats_policies where cmd = 'SELECT' and qual = 'true')),
  ('row level security is on',
    (select relrowsecurity from pg_class where oid = 'public.user_stats'::regclass))
) as checks(check_name, ok);
