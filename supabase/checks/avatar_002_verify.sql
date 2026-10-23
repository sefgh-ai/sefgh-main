-- Read-only. Confirms that
-- supabase/migrations/20261023120000_avatar_002_own_folder_reads.sql is in
-- effect. Every row must say ok = true; run it after applying the migration,
-- and again whenever Storage policies are changed outside a migration.
with avatar_policies as (
  select policyname, roles, cmd, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and coalesce(qual, '') || coalesce(with_check, '') like '%avatars%'
),
own_folder as (
  select *, (qual || with_check) like '%foldername(name))[1]%'
            and (qual || with_check) like '%auth.uid()%' as limited
  from avatar_policies
)
select check_name, ok from (values
  ('1 nobody signed out can read or list avatars',
    not exists (select 1 from own_folder where cmd in ('SELECT', 'ALL')
      and (roles && array['public', 'anon']::name[]))),
  ('1 signed-in reads are limited to the user''s own folder',
    exists (select 1 from own_folder where cmd = 'SELECT')
    and not exists (select 1 from own_folder where cmd in ('SELECT', 'ALL')
      and (roles <> array['authenticated']::name[] or not limited))),
  ('2 one avatar policy per command',
    (select count(*) = 4 and bool_and(n = 1)
     from (select cmd, count(*) as n from avatar_policies group by cmd) per_command)),
  ('2 uploads, updates and deletes are limited to the user''s own folder',
    (select count(*) = 3 and bool_and(limited) from own_folder where cmd in ('INSERT', 'UPDATE', 'DELETE'))),
  ('links still work: the bucket is public',
    coalesce((select public from storage.buckets where id = 'avatars'), false))
) as checks(check_name, ok);
