BEGIN READ ONLY; SET LOCAL statement_timeout='10s'; SET LOCAL search_path=pg_catalog;
WITH source_tables AS (SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r')
SELECT 'constraints' AS section, COALESCE(jsonb_agg(jsonb_build_object('table',t.relname,'name',k.conname,'type',k.contype,'validated',k.convalidated,'columns',k.conkey,'referenced_table',r.relname,'referenced_columns',k.confkey,'delete_action',k.confdeltype,'update_action',k.confupdtype,'expression_hash',md5(COALESCE(k.conbin::text,''))) ORDER BY t.relname,k.conname),'[]'::jsonb) AS metadata
FROM pg_constraint k JOIN source_tables t ON t.oid=k.conrelid LEFT JOIN pg_class r ON r.oid=k.confrelid
UNION ALL SELECT 'triggers',COALESCE(jsonb_agg(jsonb_build_object('table',t.relname,'trigger',g.tgname,'enabled',g.tgenabled,'type_bits',g.tgtype,'function_schema',n.nspname,'function',p.proname,'argument_bytes',octet_length(g.tgargs)) ORDER BY t.relname,g.tgname),'[]'::jsonb)
FROM pg_trigger g JOIN source_tables t ON t.oid=g.tgrelid JOIN pg_proc p ON p.oid=g.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE NOT g.tgisinternal
UNION ALL SELECT 'indexes',COALESCE(jsonb_agg(jsonb_build_object('table',t.relname,'index',c.relname,'primary',i.indisprimary,'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,'key_attributes',i.indkey::text,'operator_classes',i.indclass::text,'expression_present',i.indexprs IS NOT NULL,'predicate_present',i.indpred IS NOT NULL) ORDER BY t.relname,c.relname),'[]'::jsonb)
FROM pg_index i JOIN source_tables t ON t.oid=i.indrelid JOIN pg_class c ON c.oid=i.indexrelid
UNION ALL SELECT 'routines',COALESCE(jsonb_agg(jsonb_build_object('name',p.proname,'signature',pg_get_function_identity_arguments(p.oid),'security_definer',p.prosecdef,'execute_acl',p.proacl::text,'fixed_search_path',EXISTS(SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%')) ORDER BY p.proname,p.oid),'[]'::jsonb)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';
ROLLBACK;
