BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL search_path = pg_catalog;
SELECT n.nspname, pg_get_userbyid(n.nspowner) AS owner,
       obj_description(n.oid, 'pg_namespace') AS description,
       (SELECT count(*) FROM pg_class c WHERE c.relnamespace=n.oid) AS relation_count,
       (SELECT count(*) FROM pg_proc p WHERE p.pronamespace=n.oid) AS routine_count,
       (SELECT jsonb_agg(jsonb_build_object('role',r.name,
         'usage',has_schema_privilege(r.name,n.oid,'USAGE'),
         'create',has_schema_privilege(r.name,n.oid,'CREATE')) ORDER BY r.name)
        FROM (VALUES ('anon'),('authenticated'),('service_role')) r(name)) AS api_roles
FROM pg_namespace n WHERE n.nspname='corpus';
ROLLBACK;
