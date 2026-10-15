-- Read-only. Confirms that
-- supabase/migrations/20261015140000_sec_001_close_data_exposures.sql is in
-- effect. Every row must say ok = true; run it after applying the migration,
-- and again whenever the database is changed outside a migration.
select check_name, ok from (values
  ('1 anon cannot read profiles.email',
    not has_column_privilege('anon', 'public.profiles', 'email', 'select')),
  ('1 authenticated cannot read profiles.email',
    not has_column_privilege('authenticated', 'public.profiles', 'email', 'select')),
  ('1 anon can read the public profile columns',
    has_column_privilege('anon', 'public.profiles', 'id', 'select')
    and has_column_privilege('anon', 'public.profiles', 'full_name', 'select')
    and has_column_privilege('anon', 'public.profiles', 'avatar_url', 'select')
    and has_column_privilege('anon', 'public.profiles', 'bio', 'select')
    and has_column_privilege('anon', 'public.profiles', 'website', 'select')
    and has_column_privilege('anon', 'public.profiles', 'created_at', 'select')
    and has_column_privilege('anon', 'public.profiles', 'updated_at', 'select')),
  ('2 nobody signed in or out runs get_user_activity_heatmap',
    not has_function_privilege('anon', 'public.get_user_activity_heatmap(uuid, integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.get_user_activity_heatmap(uuid, integer)', 'execute')),
  ('2 nobody signed in or out runs get_user_activity_stats',
    not has_function_privilege('anon', 'public.get_user_activity_stats(uuid, integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.get_user_activity_stats(uuid, integer)', 'execute')),
  ('3 log_user_activity runs with the caller''s rights',
    not (select prosecdef from pg_proc where oid = 'public.log_user_activity(uuid, text, jsonb)'::regprocedure)),
  ('3 log_user_activity: signed in only',
    not has_function_privilege('anon', 'public.log_user_activity(uuid, text, jsonb)', 'execute')
    and has_function_privilege('authenticated', 'public.log_user_activity(uuid, text, jsonb)', 'execute')),
  ('4 no trending_repos write policy for authenticated',
    not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'trending_repos'
      and cmd <> 'SELECT' and 'authenticated' = any (roles))),
  ('5 increment_platform_stat: signed in only',
    not has_function_privilege('anon', 'public.increment_platform_stat(text)', 'execute')
    and has_function_privilege('authenticated', 'public.increment_platform_stat(text)', 'execute')),
  ('5 increment_category_usage: nobody',
    not has_function_privilege('anon', 'public.increment_category_usage(text)', 'execute')
    and not has_function_privilege('authenticated', 'public.increment_category_usage(text)', 'execute')),
  ('5 upsert_shared_conversation: signed in only',
    not has_function_privilege('anon', 'public.upsert_shared_conversation(uuid, boolean, text, text, jsonb)', 'execute')
    and has_function_privilege('authenticated', 'public.upsert_shared_conversation(uuid, boolean, text, text, jsonb)', 'execute')),
  ('5 auth.users trigger functions: not callable',
    not has_function_privilege('anon', 'public.handle_new_user()', 'execute')
    and not has_function_privilege('authenticated', 'public.handle_user_update()', 'execute')
    and not has_function_privilege('anon', 'public.create_user_stats_on_signup()', 'execute')),
  ('5 every owner-rights function in public fixes its search_path',
    not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')))
) as checks(check_name, ok)
order by check_name;
