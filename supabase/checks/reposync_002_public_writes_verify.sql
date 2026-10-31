BEGIN READ ONLY; SET LOCAL statement_timeout='10s'; SET LOCAL search_path=pg_catalog;
WITH tables AS (SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('ReposMeta','api_key_usage_log','error_events','repo_analysis','repo_chunks','repositories_search','session_snapshots','topic_list','topic_processing_history'))
SELECT t.relname,
(SELECT bool_and(NOT has_table_privilege(r.role_name,t.oid,p.privilege_name)) FROM (VALUES ('anon'),('authenticated')) r(role_name) CROSS JOIN (VALUES ('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege_name)) AS api_table_writes_denied,
(SELECT bool_and(NOT has_any_column_privilege(r.role_name,t.oid,p.privilege_name)) FROM (VALUES ('anon'),('authenticated')) r(role_name) CROSS JOIN (VALUES ('INSERT'),('UPDATE'),('REFERENCES')) p(privilege_name)) AS api_column_writes_denied,
(SELECT bool_and(has_table_privilege(r.role_name,t.oid,'SELECT')) FROM (VALUES ('anon'),('authenticated')) r(role_name)) AS existing_reads_preserved,
(SELECT bool_and(has_table_privilege('service_role',t.oid,p.privilege_name)) FROM (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(privilege_name)) AS service_worker_crud_preserved
FROM tables t ORDER BY t.relname; ROLLBACK;
