-- Read-only. Confirms that
-- supabase/migrations/20261028120000_r078_drop_unused_tables.sql is in
-- effect. Every row must say ok = true.
select check_name, ok from (values
  ('the four tables are gone',
    not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('repository_notifications', 'repository_shares', 'repository_bookmarks', 'user-data'))),
  ('the reply trigger and both functions are gone',
    not exists (select 1 from pg_trigger where tgname = 'trigger_reply_notification')
    and to_regprocedure('public.create_reply_notification()') is null
    and to_regprocedure('public.get_repository_stats(text)') is null),
  ('the backup holds all four tables',
    (select count(*) = 4 from pg_tables where schemaname = 'r078_backup')),
  ('the API roles cannot use the backup',
    not has_schema_privilege('anon', 'r078_backup', 'usage')
    and not has_schema_privilege('authenticated', 'r078_backup', 'usage')),
  ('comments are untouched',
    to_regclass('public.repository_comments') is not null)
) as checks(check_name, ok);
