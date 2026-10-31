-- DB-CONSOLIDATE-001: metadata only, NOT a migration or transfer.
-- Run separately on independently confirmed source Repo-DB kiadrbqkkmncoblpcobo
-- and destination User-DB kohwfuxqbllsmvmsfqci. Record which result is which.
-- Owner chose corpus schema in User-DB, preserving app behavior and data.
-- No application rows, defaults, policy expressions, function bodies,
-- scheduler commands, role credentials, or database settings are returned.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';
SET LOCAL search_path = pg_catalog;

WITH relations AS (
  SELECT c.oid, n.nspname AS schema_name, c.relname AS relation_name,
         c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.reltuples
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'corpus')
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
), relation_metadata AS (
  SELECT r.schema_name, r.relation_name, r.relkind,
         r.relrowsecurity AS rls_enabled,
         r.relforcerowsecurity AS rls_forced,
         CASE WHEN r.reltuples < 0 THEN NULL
              ELSE r.reltuples::bigint END AS estimated_rows,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
             'not_null', a.attnotnull, 'identity', a.attidentity,
             'generated', a.attgenerated) ORDER BY a.attnum)
           FROM pg_attribute AS a
           WHERE a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped
         ), '[]'::jsonb) AS columns,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'name', p.polname, 'command', p.polcmd,
             'permissive', p.polpermissive) ORDER BY p.polname)
           FROM pg_policy AS p WHERE p.polrelid = r.oid
         ), '[]'::jsonb) AS policy_names_only,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'name', c.conname, 'kind', c.contype,
             'validated', c.convalidated) ORDER BY c.conname)
           FROM pg_constraint AS c WHERE c.conrelid = r.oid
         ), '[]'::jsonb) AS constraints_names_only,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'name', t.tgname, 'enabled', t.tgenabled) ORDER BY t.tgname)
           FROM pg_trigger AS t
           WHERE t.tgrelid = r.oid AND NOT t.tgisinternal
         ), '[]'::jsonb) AS trigger_names_only
  FROM relations AS r
)
SELECT jsonb_build_object(
  'inventory_version', 1,
  'purpose', 'source/destination consolidation preflight',
  'database_bytes', pg_database_size(current_database()),
  'schema_names', COALESCE((SELECT jsonb_agg(nspname ORDER BY nspname)
    FROM pg_namespace WHERE nspname NOT LIKE 'pg\_%' ESCAPE '\'
      AND nspname <> 'information_schema'), '[]'::jsonb),
  'observed_at', transaction_timestamp(),
  'server_version_number', current_setting('server_version_num'),
  'transaction_read_only', current_setting('transaction_read_only'),
  'project_identity', 'MUST be recorded independently from dashboard; not inferred from SQL',
  'extensions', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('name', extname, 'version', extversion)
                     ORDER BY extname)
    FROM pg_extension WHERE extname IN ('vector', 'pg_cron', 'pg_net', 'pgmq')
  ), '[]'::jsonb),
  'relations', COALESCE((
    SELECT jsonb_agg(to_jsonb(m) ORDER BY schema_name, relation_name)
    FROM relation_metadata AS m
  ), '[]'::jsonb),
  'limits', 'Relations cover public/corpus only; review schema_names for additional application schemas. Platform schemas are not transfer candidates. Metadata only; estimates are not row counts. No function, policy, trigger or grant equivalence established.'
) AS corpus_inventory;

ROLLBACK;
