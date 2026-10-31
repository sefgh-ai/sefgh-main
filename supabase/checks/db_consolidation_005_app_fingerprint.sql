BEGIN READ ONLY; SET LOCAL statement_timeout='10s'; SET LOCAL search_path=pg_catalog;
WITH ns AS (SELECT oid FROM pg_namespace WHERE nspname IN ('public','r078_backup')),
parts AS (
SELECT 'relations' AS section,COALESCE(jsonb_agg(jsonb_build_array(c.oid,c.relname,c.relowner,c.relacl::text,c.reloptions,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.oid),'[]'::jsonb) AS content FROM pg_class c WHERE c.relnamespace IN (SELECT oid FROM ns)
UNION ALL SELECT 'columns',COALESCE(jsonb_agg(jsonb_build_array(a.attrelid,a.attnum,a.attname,a.atttypid,a.atttypmod,a.attnotnull,a.attacl::text,a.attidentity,a.attgenerated) ORDER BY a.attrelid,a.attnum),'[]'::jsonb) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE c.relnamespace IN (SELECT oid FROM ns) AND a.attnum>0 AND NOT a.attisdropped
UNION ALL SELECT 'routines',COALESCE(jsonb_agg(jsonb_build_array(p.oid,p.proname,p.proowner,p.proacl::text,p.prosecdef,p.proconfig,p.prosrc,p.proargtypes::text,p.prorettype) ORDER BY p.oid),'[]'::jsonb) FROM pg_proc p WHERE p.pronamespace IN (SELECT oid FROM ns)
UNION ALL SELECT 'policies',COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.oid),'[]'::jsonb) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid WHERE c.relnamespace IN (SELECT oid FROM ns)
UNION ALL SELECT 'triggers',COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.oid),'[]'::jsonb) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace IN (SELECT oid FROM ns)
UNION ALL SELECT 'default_privileges',COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.oid),'[]'::jsonb) FROM pg_default_acl d
)
SELECT section,md5(content::text) AS metadata_fingerprint FROM parts ORDER BY section;
ROLLBACK;
