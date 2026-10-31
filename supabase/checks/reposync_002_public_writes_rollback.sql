-- Manual emergency rollback, not automatically executed.
-- Restores previously observed anon/authenticated write grants on exact tables.
-- This reopens R-210 and requires an explicit operator decision.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public."ReposMeta",public.api_key_usage_log,public.error_events,
public.repo_analysis,public.repo_chunks,public.repositories_search,
public.session_snapshots,public.topic_list,public.topic_processing_history
TO anon,authenticated;
COMMIT;
