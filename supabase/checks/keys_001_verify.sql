-- Catalog-only post-apply verification proposal. No application rows or secrets.
-- Compare expected grants in docs/database/keys-001-review.md; do not interpret
-- a query returning rows as automatic approval of that privilege.
begin transaction read only;
select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls
from pg_roles where rolname in ('sefgh_key_accountant','authenticator');
select parent.rolname as granted_role,member.rolname as member,m.inherit_option,m.set_option
from pg_auth_members m join pg_roles parent on parent.oid=m.roleid
join pg_roles member on member.oid=m.member
where parent.rolname='sefgh_key_accountant' or member.rolname='sefgh_key_accountant';
select r,c.relname,
 has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as any_direct_privilege,
 c.relrowsecurity
from unnest(array['anon','authenticated','service_role','sefgh_key_accountant']) r
cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='sefgh_keys' and c.relkind='r' order by r,c.relname;
select n.nspname,p.proname,p.prosecdef,p.proconfig,p.proacl,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as user_exec,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service_exec,
 has_function_privilege('sefgh_key_accountant',p.oid,'EXECUTE') as accountant_exec
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='sefgh_keys' or (n.nspname='public' and p.proname like 'sefgh_key_%')
order by n.nspname,p.proname;
-- Effective PUBLIC/inherited privileges outside the proposed schema matter too.
select n.nspname,c.relname,c.relkind,c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'
and n.nspname<>'sefgh_keys' and c.relkind in ('r','p','v','m','f')
and has_schema_privilege('sefgh_key_accountant',n.oid,'USAGE')
and has_table_privilege('sefgh_key_accountant',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
order by n.nspname,c.relname;
select n.nspname,p.proname,p.prosecdef,p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'
and n.nspname<>'sefgh_keys' and p.prokind='f'
and has_schema_privilege('sefgh_key_accountant',n.oid,'USAGE')
and has_function_privilege('sefgh_key_accountant',p.oid,'EXECUTE')
order by n.nspname,p.proname;
rollback;
