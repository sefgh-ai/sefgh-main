-- DB-CONSOLIDATE-003: additive empty namespace in confirmed User-DB only.
-- Caller must first verify project kohwfuxqbllsmvmsfqci independently.
-- Fail if corpus already exists; do not silently adopt an unknown schema.
BEGIN;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';
CREATE SCHEMA corpus AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA corpus FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON SCHEMA corpus IS
  'SEFGH repository corpus staging. No API or worker access until reviewed scoped grants and RLS. DB-CONSOLIDATE-003.';
DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(name)
    WHERE pg_catalog.has_schema_privilege(r.name, 'corpus', 'USAGE')
       OR pg_catalog.has_schema_privilege(r.name, 'corpus', 'CREATE')
  ) THEN
    RAISE EXCEPTION 'corpus namespace remains accessible to an API role';
  END IF;
END
$verify$;
COMMIT;
