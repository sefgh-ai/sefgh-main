BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL search_path=pg_catalog;
SELECT n.nspname AS schema_name,c.relname AS relation_name,c.relkind,
  has_table_privilege('anon',c.oid,'SELECT') AS anon_table_select,
  has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_table_select,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('column',a.attname,'anon_select',has_column_privilege('anon',c.oid,a.attnum,'SELECT'),'authenticated_select',has_column_privilege('authenticated',c.oid,a.attnum,'SELECT')) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb) AS column_read_grants
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('profiles','repo_embeddings','repository_cache','repository_comments','repository_comment_votes','repository_votes','repo_comments','repo_votes','repo_ratings')
ORDER BY c.relname;
ROLLBACK;
