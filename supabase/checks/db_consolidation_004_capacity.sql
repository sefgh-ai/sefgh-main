BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL search_path=pg_catalog;
SELECT n.nspname AS schema_name,c.relname AS table_name,
pg_total_relation_size(c.oid) AS total_bytes,
pg_relation_size(c.oid) AS heap_bytes,
pg_indexes_size(c.oid) AS index_bytes,
CASE WHEN c.reltuples<0 THEN NULL ELSE c.reltuples::bigint END AS estimated_rows
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','corpus','r078_backup') AND c.relkind IN ('r','p')
ORDER BY n.nspname,c.relname;
ROLLBACK;
