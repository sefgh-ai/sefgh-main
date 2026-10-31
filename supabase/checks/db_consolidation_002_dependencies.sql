BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL search_path = pg_catalog;
SELECT 'relations_outside_public' AS section, COALESCE(jsonb_agg(jsonb_build_object('schema', n.nspname,'name',c.relname,'kind',c.relkind) ORDER BY c.relname),'[]'::jsonb) AS metadata
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r078_backup' AND c.relkind IN ('r','p','v','m')
UNION ALL
SELECT 'profile_trigger_targets',COALESCE(jsonb_agg(jsonb_build_object('trigger',t.tgname,'function_schema',pn.nspname,'function',p.proname,'enabled',t.tgenabled) ORDER BY t.tgname),'[]'::jsonb)
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
WHERE n.nspname='public' AND c.relname='profiles' AND NOT t.tgisinternal
UNION ALL
SELECT 'view_dependencies', COALESCE(jsonb_agg(DISTINCT jsonb_build_object('view',v.relname,'depends_on_schema',bn.nspname,'depends_on',b.relname)),'[]'::jsonb)
FROM pg_class v JOIN pg_namespace vn ON vn.oid=v.relnamespace JOIN pg_rewrite r ON r.ev_class=v.oid JOIN pg_depend d ON d.objid=r.oid AND d.classid='pg_rewrite'::regclass AND d.refclassid='pg_class'::regclass JOIN pg_class b ON b.oid=d.refobjid JOIN pg_namespace bn ON bn.oid=b.relnamespace
WHERE vn.nspname='public' AND v.relkind='v' AND b.oid<>v.oid;
ROLLBACK;
