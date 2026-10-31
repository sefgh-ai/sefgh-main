-- R-210: reviewed proposal for exact Repo-DB kiadrbqkkmncoblpcobo only.
-- Requires owner decision; NOT applied as part of User-DB namespace setup.
BEGIN;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';
DO $preflight$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY['ReposMeta','api_key_usage_log','error_events',
    'repo_analysis','repo_chunks','repositories_search','session_snapshots',
    'topic_list','topic_processing_history']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=name AND c.relkind='r'
        AND NOT c.relrowsecurity AND pg_catalog.pg_get_userbyid(c.relowner)='postgres')
    THEN RAISE EXCEPTION 'source table preflight mismatch: %',name; END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid=pg_catalog.to_regclass(pg_catalog.format('public.%I',name))
        AND a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL)
    THEN RAISE EXCEPTION 'source column grants require a separate rollback: %',name; END IF;
  END LOOP;
END
$preflight$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public."ReposMeta",public.api_key_usage_log,public.error_events,
public.repo_analysis,public.repo_chunks,public.repositories_search,
public.session_snapshots,public.topic_list,public.topic_processing_history
FROM PUBLIC,anon,authenticated;
DO $verify$
DECLARE name text; role_name text; privilege_name text; relation oid;
BEGIN
  FOREACH name IN ARRAY ARRAY['ReposMeta','api_key_usage_log','error_events',
    'repo_analysis','repo_chunks','repositories_search','session_snapshots',
    'topic_list','topic_processing_history']
  LOOP
    relation := pg_catalog.to_regclass(pg_catalog.format('public.%I',name));
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF pg_catalog.has_table_privilege(role_name,relation,privilege_name)
        THEN RAISE EXCEPTION 'effective public write remains'; END IF;
      END LOOP;
      FOREACH privilege_name IN ARRAY ARRAY['INSERT','UPDATE','REFERENCES'] LOOP
        IF pg_catalog.has_any_column_privilege(role_name,relation,privilege_name)
        THEN RAISE EXCEPTION 'effective public column write remains'; END IF;
      END LOOP;
      IF NOT pg_catalog.has_table_privilege(role_name,relation,'SELECT')
      THEN RAISE EXCEPTION 'existing direct read changed'; END IF;
    END LOOP;
    FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      IF NOT pg_catalog.has_table_privilege('service_role',relation,privilege_name)
      THEN RAISE EXCEPTION 'existing worker access changed'; END IF;
    END LOOP;
  END LOOP;
END
$verify$;
COMMIT;
