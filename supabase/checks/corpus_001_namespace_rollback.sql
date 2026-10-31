-- Manual rollback only. Never CASCADE. Refuse once anything has been added.
-- This is not automatically run by verification or handoff.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';
DO $guard$
DECLARE ns oid;
BEGIN
  SELECT oid INTO ns FROM pg_catalog.pg_namespace WHERE nspname='corpus';
  IF ns IS NULL THEN RAISE EXCEPTION 'corpus does not exist'; END IF;
  IF pg_catalog.obj_description(ns,'pg_namespace') IS DISTINCT FROM
    'SEFGH repository corpus staging. No API or worker access until reviewed scoped grants and RLS. DB-CONSOLIDATE-003.'
  THEN RAISE EXCEPTION 'corpus marker does not match this migration'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relnamespace=ns)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE pronamespace=ns)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_type WHERE typnamespace=ns)
  THEN RAISE EXCEPTION 'corpus is populated; do not drop it'; END IF;
END
$guard$;
DROP SCHEMA corpus RESTRICT;
COMMIT;
