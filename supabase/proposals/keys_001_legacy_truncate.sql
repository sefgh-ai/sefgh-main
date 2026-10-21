-- R-143: separate REVIEW PROPOSAL, not an applied migration.
-- RLS does not cover TRUNCATE. No app path requires this privilege.
-- Preserve current CRUD/RLS and all rows. Run only after owner SQL review.
begin;
revoke truncate on public.api_keys,public.api_limits,public.api_logs from public,anon,authenticated;
commit;
