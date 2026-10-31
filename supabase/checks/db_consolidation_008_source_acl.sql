BEGIN READ ONLY; SET LOCAL statement_timeout='10s'; SET LOCAL search_path=pg_catalog;
SELECT c.relname,pg_get_userbyid(c.relowner) AS owner,c.relacl::text AS acl
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;
ROLLBACK;
