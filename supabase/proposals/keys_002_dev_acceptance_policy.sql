-- REVIEW PROPOSAL ONLY. Do not apply without explicit owner approval.
-- Target: sefgh-migration-dev / mraglhrenqwadegvwxts ONLY.
-- Test configuration, not production quota or retention policy.
-- Check the MCP project_id separately: SQL cannot prove the project reference.
begin;
do $$ begin
  if to_regnamespace('sefgh_keys') is null then
    raise exception 'SEFGH_ACCEPTANCE_SCHEMA_MISSING';
  end if;
  -- Collision/data guards, not substitutes for checking the target.
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m','f'))
    or exists(select 1 from sefgh_keys.policy)
    or exists(select 1 from sefgh_keys.keys)
    or exists(select 1 from sefgh_keys.events)
    or exists(select 1 from sefgh_keys.recovery)
    or exists(select 1 from sefgh_keys.key_windows)
    or exists(select 1 from sefgh_keys.owner_windows) then
    raise exception 'SEFGH_ACCEPTANCE_NOT_PRISTINE';
  end if;
end $$;
insert into sefgh_keys.policy (
  singleton, revision, enabled, max_active, max_name_runes, per_key, per_owner,
  lifetime_seconds, window_seconds, completion_timeout_seconds
) values (true, 'dev-acceptance-v1', true, 2, 80, 2, 3, 600, 86400, 1);
commit;
