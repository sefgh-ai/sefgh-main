-- KEYS-001a preflight. Catalog definitions only: no key or usage row values.
-- Review/run with read-only access. This file does not change the database.
begin transaction read only;

select table_name, column_name, data_type, udt_schema, udt_name,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (table_name in ('api_keys', 'api_usage_logs', 'api_usage', 'usage_logs')
       or table_name like '%api%key%' or table_name like '%usage%')
order by table_name, ordinal_position;

select c.relname as table_name, c.relrowsecurity, c.relforcerowsecurity,
       pg_catalog.pg_get_userbyid(c.relowner) as owner, c.relacl
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v')
  and (c.relname like '%api%key%' or c.relname like '%usage%')
order by c.relname;

select tablename, policyname, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and (tablename like '%api%key%' or tablename like '%usage%')
order by tablename, policyname;

select r.relname as table_name, c.conname,
       pg_catalog.pg_get_constraintdef(c.oid) as definition
from pg_catalog.pg_constraint c
join pg_catalog.pg_class r on r.oid = c.conrelid
join pg_catalog.pg_namespace n on n.oid = r.relnamespace
where n.nspname = 'public'
  and (r.relname like '%api%key%' or r.relname like '%usage%')
order by r.relname, c.conname;

select r.relname as table_name, t.tgname,
       pg_catalog.pg_get_triggerdef(t.oid) as trigger_definition,
       pg_catalog.pg_get_functiondef(t.tgfoid) as function_definition
from pg_catalog.pg_trigger t
join pg_catalog.pg_class r on r.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = r.relnamespace
where n.nspname = 'public' and not t.tgisinternal
  and (r.relname like '%api%key%' or r.relname like '%usage%')
order by r.relname, t.tgname;

select n.nspname as schema_name, p.proname,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef, p.proconfig, p.proacl,
       pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and (p.proname like '%api%key%' or p.proname like '%usage%')
order by p.proname, arguments;

commit;
