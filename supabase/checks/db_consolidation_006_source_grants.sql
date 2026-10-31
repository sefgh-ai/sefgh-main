BEGIN READ ONLY; SET LOCAL statement_timeout='15s'; SET LOCAL search_path=pg_catalog;
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
has_table_privilege('anon',c.oid,'INSERT') AS anon_insert,
has_table_privilege('anon',c.oid,'UPDATE') AS anon_update,
has_table_privilege('anon',c.oid,'DELETE') AS anon_delete,
has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;
ROLLBACK;
