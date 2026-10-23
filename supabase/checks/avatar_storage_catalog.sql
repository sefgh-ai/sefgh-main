-- AVATAR-POLICY-001. What POST /api/upload-avatar depends on in Storage.
-- Catalog definitions and row counts only: no object names, user ids or URLs.
-- Review/run with read-only access. This file does not change the database.
-- What each result settles: ../../docs/database/avatar-storage.md
begin transaction read only;

-- 1. The bucket. `public` decides whether getPublicUrl links work at all;
-- the size and type limits decide whether Storage refuses before any policy.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'avatars' or name = 'avatars';

-- 2. Row-level security and table privileges on the two Storage tables.
select c.relname as table_name, c.relrowsecurity, c.relforcerowsecurity,
       pg_catalog.pg_get_userbyid(c.relowner) as owner, c.relacl
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'storage' and c.relname in ('objects', 'buckets')
order by c.relname;

-- 3. Every policy on the two Storage tables, not only the avatar ones:
-- a policy for another bucket can still widen listBuckets or list.
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'storage' and tablename in ('objects', 'buckets')
order by tablename, cmd, policyname;

-- 4. The profile write the route makes after the upload.
select policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public' and tablename = 'profiles' and cmd in ('UPDATE', 'ALL')
order by policyname;

-- 5. Helpers the policies use or could use. The operation-aware helpers
-- exist only in newer Storage versions.
select p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef, pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'storage'
  and p.proname in ('foldername', 'allow_any_operation', 'allow_only_operation')
order by p.proname, arguments;

-- 6. Storage schema version.
select name, executed_at from storage.migrations order by id desc limit 1;

-- 7. Counts only. More than one object per folder means the best-effort
-- cleanup (R-095) has failed or raced; a folder that is not a current
-- user id is left over from a deleted account or written outside the route.
select count(*) as objects,
       count(distinct (storage.foldername(o.name))[1]) as folders,
       count(*) filter (where cardinality(storage.foldername(o.name)) = 0) as objects_at_root
from storage.objects o
where o.bucket_id = 'avatars';

select count(*) as folders_with_more_than_one_object
from (
  select (storage.foldername(o.name))[1] as folder
  from storage.objects o
  where o.bucket_id = 'avatars'
  group by 1
  having count(*) > 1
) f;

select count(distinct (storage.foldername(o.name))[1]) as folders_without_a_user
from storage.objects o
where o.bucket_id = 'avatars'
  and not exists (
    select 1 from auth.users u
    where u.id::text = (storage.foldername(o.name))[1]
  );

commit;
