-- Read-only. Confirms that
-- supabase/migrations/20261028120000_r078_drop_unused_tables.sql is in
-- effect. Every row must say ok = true.
with notification_policies as (
  select policyname, cmd from pg_policies
  where schemaname = 'public' and tablename = 'repository_notifications'
)
select check_name, ok from (values
  ('the three unused tables are gone',
    not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in ('repository_shares', 'repository_bookmarks', 'user-data'))),
  ('get_repository_stats is gone',
    to_regprocedure('public.get_repository_stats(text)') is null),
  ('notifications are kept, with row level security on',
    coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.repository_notifications')), false)),
  ('nobody can add or delete notifications through the API',
    not exists (select 1 from notification_policies where cmd in ('INSERT', 'DELETE', 'ALL'))),
  ('users still read and mark their own notifications',
    (select count(*) = 2 from notification_policies where cmd in ('SELECT', 'UPDATE'))),
  ('replies still notify: the trigger runs with its owner''s rights',
    exists (select 1 from pg_trigger where tgname = 'trigger_reply_notification'
      and tgrelid = to_regclass('public.repository_comments') and tgenabled = 'O')
    and coalesce((select prosecdef and proconfig @> array['search_path=""']
      from pg_proc where oid = to_regprocedure('public.create_reply_notification()')), false)),
  ('the backup holds the three tables',
    (select count(*) = 3 from pg_tables where schemaname = 'r078_backup')),
  ('the API roles cannot use the backup',
    not has_schema_privilege('anon', 'r078_backup', 'usage')
    and not has_schema_privilege('authenticated', 'r078_backup', 'usage'))
) as checks(check_name, ok);
