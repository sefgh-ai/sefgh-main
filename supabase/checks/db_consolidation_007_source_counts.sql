BEGIN READ ONLY; SET LOCAL statement_timeout='15s'; SELECT 'ReposMeta' AS table_name,count(*) AS exact_rows,count(*) FILTER (WHERE is_private IS TRUE) AS private_flag_count FROM public."ReposMeta"
UNION ALL SELECT 'ReposMeta-Research',count(*),NULL FROM public."ReposMeta-Research"
UNION ALL SELECT 'api_key_usage_log',count(*),NULL FROM public.api_key_usage_log
UNION ALL SELECT 'error_events',count(*),NULL FROM public.error_events
UNION ALL SELECT 'repo_analysis',count(*),NULL FROM public.repo_analysis
UNION ALL SELECT 'repo_chunks',count(*),NULL FROM public.repo_chunks
UNION ALL SELECT 'repositories_search',count(*),NULL FROM public.repositories_search
UNION ALL SELECT 'session_snapshots',count(*),NULL FROM public.session_snapshots
UNION ALL SELECT 'topic_list',count(*),NULL FROM public.topic_list
UNION ALL SELECT 'topic_processing_history',count(*),NULL FROM public.topic_processing_history;
ROLLBACK;
