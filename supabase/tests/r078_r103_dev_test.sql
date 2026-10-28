-- Dev-only test of the R-078 and R-103 migrations (OWNER-ANSWERS-005).
-- Run it on the development project sefgh-migration-dev, never on User-DB:
-- it builds a copy of the five tables there with production's rules (read
-- 2026-10-28), shows both bugs, applies both migrations and both verify
-- queries, acts as signed-in and signed-out users, then applies both
-- rollbacks. The whole script is one transaction and ends with an error that
-- carries the results, so nothing it does is kept. Every result must be
-- "ok": true. References to auth.users are left out: dev has no users.

-- Scaffold.
create table public.repository_comments (id uuid primary key default gen_random_uuid(), user_id uuid not null, repo_full_name text not null, parent_comment_id uuid, content text);
create table public.repository_votes (repo_full_name text, rating int);
create table public.repository_notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null, type text not null, repo_full_name text not null, comment_id uuid references public.repository_comments(id) on delete cascade, from_user_id uuid, read boolean default false, created_at timestamptz default now());
create table public.repository_shares (id uuid primary key default gen_random_uuid(), user_id uuid, repo_full_name text not null, platform text, created_at timestamptz default now());
create table public.repository_bookmarks (id uuid primary key default gen_random_uuid(), user_id uuid not null, repo_full_name text not null, repo_data jsonb, created_at timestamptz default now(), unique (user_id, repo_full_name));
create table public."user-data" (user_id varchar primary key, user_name varchar not null unique, last_login timestamptz, devices json, preferences json, plan text default '"free"');
create table public.user_stats (id uuid primary key default gen_random_uuid(), user_id uuid not null unique, level integer not null default 1 check (level >= 1 and level <= 100), title text not null default 'Newbie', xp integer not null default 0, xp_to_next_level integer not null default 100, contributions integer not null default 0, contributions_max integer not null default 64, followers integer not null default 0, following integer not null default 0, projects integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant all on public.repository_comments, public.repository_votes, public.repository_notifications, public.repository_shares, public.repository_bookmarks, public."user-data", public.user_stats to anon, authenticated, service_role;
alter table public.repository_comments enable row level security;
create policy "test comments insert" on public.repository_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "test comments read" on public.repository_comments for select using (true);
alter table public.repository_notifications enable row level security;
alter table public.repository_shares enable row level security;
alter table public.repository_bookmarks enable row level security;
alter table public."user-data" enable row level security;
alter table public.user_stats enable row level security;
create policy "System can insert notifications" on public.repository_notifications for insert with check (true);
create policy "Users can update own notifications" on public.repository_notifications for update using (auth.uid() = user_id);
create policy "Users can view own notifications" on public.repository_notifications for select using (auth.uid() = user_id);
create policy "Users can insert shares" on public.repository_shares for insert with check (true);
create policy "Users can view all shares" on public.repository_shares for select using (true);
create policy "Users can delete own bookmarks" on public.repository_bookmarks for delete using (auth.uid() = user_id);
create policy "Users can insert own bookmarks" on public.repository_bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can view all bookmarks" on public.repository_bookmarks for select using (true);
create policy "Users can insert their own stats" on public.user_stats for insert with check (auth.uid() = user_id);
create policy "Users can update their own stats" on public.user_stats for update using (auth.uid() = user_id);
create policy "Users can view other users public stats" on public.user_stats for select using (true);
create policy "Users can view their own stats" on public.user_stats for select using (auth.uid() = user_id);
create function public.get_repository_stats(repo_name text) returns json language plpgsql as $function$
declare result json;
begin
  select json_build_object('total_bookmarks', (select count(*) from repository_bookmarks where repo_full_name = repo_name), 'total_votes', (select count(*) from repository_votes where repo_full_name = repo_name), 'average_rating', (select coalesce(avg(rating), 0) from repository_votes where repo_full_name = repo_name), 'total_comments', (select count(*) from repository_comments where repo_full_name = repo_name and parent_comment_id is null), 'total_shares', (select count(*) from repository_shares where repo_full_name = repo_name)) into result;
  return result;
end;
$function$;
create function public.create_reply_notification() returns trigger language plpgsql as $function$
declare parent_user_id uuid;
begin
  if new.parent_comment_id is not null then
    select user_id into parent_user_id from repository_comments where id = new.parent_comment_id;
    if parent_user_id != new.user_id then
      insert into repository_notifications (user_id, type, repo_full_name, comment_id, from_user_id) values (parent_user_id, 'comment_reply', new.repo_full_name, new.id, new.user_id);
    end if;
  end if;
  return new;
end;
$function$;
create trigger trigger_reply_notification after insert on public.repository_comments for each row execute function public.create_reply_notification();
insert into public.repository_bookmarks (user_id, repo_full_name) values ('00000000-0000-0000-0000-00000000000b', 'octo/demo');
insert into public."user-data" (user_id, user_name) values ('fixture', 'fixture');

create temp table r (step text, ok boolean, detail text);
insert into r select '0 the copy has production''s rules', md5(string_agg(tablename||'|'||policyname||'|'||roles::text||'|'||cmd||'|'||coalesce(qual,'')||'|'||coalesce(with_check,''), ';' order by tablename, policyname)) = '916af53369be1ef242b437bf4da0a516', count(*)::text
  from pg_policies where schemaname='public' and tablename in ('repository_notifications','repository_shares','repository_bookmarks','user-data','user_stats');

-- 1. Both bugs.
do $$
declare a uuid := '00000000-0000-0000-0000-00000000000a'; b uuid := '00000000-0000-0000-0000-00000000000b'; c uuid := '00000000-0000-0000-0000-00000000000c'; n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.user_stats (user_id) values (a);
  update public.user_stats set xp = 999, title = 'Legend' where user_id = a;
  get diagnostics n = row_count;
  insert into public.repository_notifications (user_id, type, repo_full_name, from_user_id) values (b, 'forged', 'octo/demo', c);
  reset role;
  insert into r values ('1 before: a user raises their own XP (R-103)', n = 1, n::text);
  insert into r values ('1 before: a user adds a notification for someone else, naming a sender (R-078)', (select count(*) = 1 from public.repository_notifications where type = 'forged'), null);
  update public.user_stats set xp = 0, title = 'Newbie' where user_id = a;
end $$;

-- 2. supabase/migrations/20261028120000_r078_drop_unused_tables.sql
create schema r078_backup;
revoke all on schema r078_backup from public, anon, authenticated;
create table r078_backup.repository_shares (like public.repository_shares including all);
insert into r078_backup.repository_shares select * from public.repository_shares;
create table r078_backup.repository_bookmarks (like public.repository_bookmarks including all);
insert into r078_backup.repository_bookmarks select * from public.repository_bookmarks;
create table r078_backup."user-data" (like public."user-data" including all);
insert into r078_backup."user-data" select * from public."user-data";
revoke all on all tables in schema r078_backup from public, anon, authenticated;
create or replace function public.create_reply_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  parent_user_id uuid;
begin
  -- Only replies notify, and never a reply to one's own comment.
  if new.parent_comment_id is not null then
    select user_id into parent_user_id from public.repository_comments where id = new.parent_comment_id;
    if parent_user_id != new.user_id then
      insert into public.repository_notifications (user_id, type, repo_full_name, comment_id, from_user_id)
      values (parent_user_id, 'comment_reply', new.repo_full_name, new.id, new.user_id);
    end if;
  end if;
  return new;
end;
$function$;
revoke execute on function public.create_reply_notification() from public, anon, authenticated;
drop policy "System can insert notifications" on public.repository_notifications;
drop function public.get_repository_stats(text);
drop table public.repository_shares;
drop table public.repository_bookmarks;
drop table public."user-data";

-- supabase/migrations/20261028120100_r103_user_stats_server_only.sql
insert into public.user_stats (user_id)
select id from auth.users
on conflict (user_id) do nothing;
drop policy "Users can update their own stats" on public.user_stats;
drop policy "Users can insert their own stats" on public.user_stats;

-- supabase/checks/r078_verify.sql
insert into r with notification_policies as (
  select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'repository_notifications'
)
select '2 verify r078: ' || check_name, ok, null from (values
  ('the three unused tables are gone', not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('repository_shares', 'repository_bookmarks', 'user-data'))),
  ('get_repository_stats is gone', to_regprocedure('public.get_repository_stats(text)') is null),
  ('notifications are kept, with row level security on', coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.repository_notifications')), false)),
  ('nobody can add or delete notifications through the API', not exists (select 1 from notification_policies where cmd in ('INSERT', 'DELETE', 'ALL'))),
  ('users still read and mark their own notifications', (select count(*) = 2 from notification_policies where cmd in ('SELECT', 'UPDATE'))),
  ('replies still notify: the trigger runs with its owner''s rights', exists (select 1 from pg_trigger where tgname = 'trigger_reply_notification' and tgrelid = to_regclass('public.repository_comments') and tgenabled = 'O') and coalesce((select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = to_regprocedure('public.create_reply_notification()')), false)),
  ('the backup holds the three tables', (select count(*) = 3 from pg_tables where schemaname = 'r078_backup')),
  ('the API roles cannot use the backup', not has_schema_privilege('anon', 'r078_backup', 'usage') and not has_schema_privilege('authenticated', 'r078_backup', 'usage'))
) as checks(check_name, ok);

-- supabase/checks/r103_verify.sql
insert into r with stats_policies as (
  select policyname, cmd, coalesce(qual, '') as qual from pg_policies where schemaname = 'public' and tablename = 'user_stats'
)
select '2 verify r103: ' || check_name, ok, null from (values
  ('nobody can create, change or delete stats through the API', not exists (select 1 from stats_policies where cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL'))),
  ('every user has a stats row', not exists (select 1 from auth.users u where not exists (select 1 from public.user_stats s where s.user_id = u.id))),
  ('everyone can still read stats', exists (select 1 from stats_policies where cmd = 'SELECT' and qual = 'true')),
  ('row level security is on', (select relrowsecurity from pg_class where oid = 'public.user_stats'::regclass))
) as checks(check_name, ok);

-- 3. Behaviour after both migrations.
do $$
declare a uuid := '00000000-0000-0000-0000-00000000000a'; b uuid := '00000000-0000-0000-0000-00000000000b'; c uuid := '00000000-0000-0000-0000-00000000000c'; n int; refused boolean; parent uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.user_stats set xp = 5 where user_id = a;
  get diagnostics n = row_count;
  reset role;
  insert into r values ('3 after: a user cannot change their stats', n = 0, n::text);

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.user_stats (user_id) values (c); refused := false; exception when insufficient_privilege then refused := true; end;
  reset role;
  insert into r values ('3 after: a user cannot create even their own empty row', refused, null);
  set local role anon;
  begin insert into public.user_stats (user_id) values (c); refused := false; exception when insufficient_privilege then refused := true; end;
  reset role;
  insert into r values ('3 after: a signed-out caller cannot create a row', refused, null);
  set local role anon;
  select count(*) into n from public.user_stats;
  reset role;
  insert into r values ('3 after: stats are still readable by everyone', n = 1, n::text);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.repository_comments (user_id, repo_full_name, content) values (b, 'octo/demo', 'top') returning id into parent;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.repository_comments (user_id, repo_full_name, parent_comment_id, content) values (a, 'octo/demo', parent, 'reply');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.repository_comments (user_id, repo_full_name, parent_comment_id, content) values (b, 'octo/demo', parent, 'own reply');
  reset role;
  insert into r values ('3 after: replies are saved and the reply to another user notifies them', (select count(*) = 3 from public.repository_comments) and (select count(*) = 1 from public.repository_notifications where type = 'comment_reply' and user_id = b and from_user_id = a), (select count(*) from public.repository_notifications where type = 'comment_reply')::text);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.repository_notifications (user_id, type, repo_full_name, from_user_id) values (b, 'forged', 'octo/demo', c); refused := false; exception when insufficient_privilege then refused := true; end;
  reset role;
  insert into r values ('3 after: a user cannot add a notification directly', refused, null);
  set local role anon;
  begin insert into public.repository_notifications (user_id, type, repo_full_name) values (b, 'forged', 'octo/demo'); refused := false; exception when insufficient_privilege then refused := true; end;
  reset role;
  insert into r values ('3 after: a signed-out caller cannot add a notification', refused, null);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.repository_notifications;
  reset role;
  insert into r values ('3 after: a user cannot see someone else''s notifications', n = 0, n::text);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.repository_notifications set read = true where type = 'comment_reply';
  get diagnostics n = row_count;
  reset role;
  insert into r values ('3 after: a user reads and marks their own notifications', n = 1 and (select count(*) = 1 from public.repository_notifications where read), n::text);

  set local role anon;
  begin perform 1 from r078_backup.repository_bookmarks; refused := false; exception when insufficient_privilege then refused := true; end;
  reset role;
  insert into r values ('3 after: signed-out callers cannot read the backup', refused, null);
  set local role authenticated;
  begin perform 1 from r078_backup."user-data"; refused := false; exception when insufficient_privilege then refused := true; end;
  reset role;
  insert into r values ('3 after: signed-in callers cannot read the backup', refused, null);
  insert into r values ('3 after: the backup holds every row', (select count(*) from r078_backup.repository_bookmarks) = 1 and (select count(*) from r078_backup."user-data") = 1 and (select count(*) from r078_backup.repository_shares) = 0, null);
end $$;

-- 4. supabase/checks/r103_rollback.sql
create policy "Users can insert their own stats" on public.user_stats for insert with check (auth.uid() = user_id);
create policy "Users can update their own stats" on public.user_stats for update using (auth.uid() = user_id);

-- supabase/checks/r078_rollback.sql, sections 1 to 3 (references to auth.users left out)
create table public.repository_shares (like r078_backup.repository_shares including all);
insert into public.repository_shares select * from r078_backup.repository_shares;
create table public.repository_bookmarks (like r078_backup.repository_bookmarks including all);
insert into public.repository_bookmarks select * from r078_backup.repository_bookmarks;
create table public."user-data" (like r078_backup."user-data" including all);
insert into public."user-data" select * from r078_backup."user-data";
grant all on table public.repository_shares, public.repository_bookmarks, public."user-data" to anon, authenticated, service_role;
alter table public.repository_shares enable row level security;
alter table public.repository_bookmarks enable row level security;
alter table public."user-data" enable row level security;
create policy "System can insert notifications" on public.repository_notifications for insert with check (true);
create policy "Users can insert shares" on public.repository_shares for insert with check (true);
create policy "Users can view all shares" on public.repository_shares for select using (true);
create policy "Users can delete own bookmarks" on public.repository_bookmarks for delete using (auth.uid() = user_id);
create policy "Users can insert own bookmarks" on public.repository_bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can view all bookmarks" on public.repository_bookmarks for select using (true);
create or replace function public.create_reply_notification()
returns trigger
language plpgsql
security invoker
as $function$
declare
  parent_user_id uuid;
begin
  if new.parent_comment_id is not null then
    select user_id into parent_user_id from repository_comments where id = new.parent_comment_id;
    if parent_user_id != new.user_id then
      insert into repository_notifications (user_id, type, repo_full_name, comment_id, from_user_id)
      values (parent_user_id, 'comment_reply', new.repo_full_name, new.id, new.user_id);
    end if;
  end if;
  return new;
end;
$function$;
grant execute on function public.create_reply_notification() to public, anon, authenticated;
create function public.get_repository_stats(repo_name text)
returns json
language plpgsql
as $function$
declare
  result json;
begin
  select json_build_object(
    'total_bookmarks', (select count(*) from repository_bookmarks where repo_full_name = repo_name),
    'total_votes', (select count(*) from repository_votes where repo_full_name = repo_name),
    'average_rating', (select coalesce(avg(rating), 0) from repository_votes where repo_full_name = repo_name),
    'total_comments', (select count(*) from repository_comments where repo_full_name = repo_name and parent_comment_id is null),
    'total_shares', (select count(*) from repository_shares where repo_full_name = repo_name)
  ) into result;
  return result;
end;
$function$;

insert into r select '4 rollback: rules match production again', md5(string_agg(tablename||'|'||policyname||'|'||roles::text||'|'||cmd||'|'||coalesce(qual,'')||'|'||coalesce(with_check,''), ';' order by tablename, policyname)) = '916af53369be1ef242b437bf4da0a516', count(*)::text
  from pg_policies where schemaname='public' and tablename in ('repository_notifications','repository_shares','repository_bookmarks','user-data','user_stats');
insert into r select '4 rollback: the reply function runs as the caller again', not prosecdef and proconfig is null, null from pg_proc where oid = 'public.create_reply_notification()'::regprocedure;
do $$
declare a uuid := '00000000-0000-0000-0000-00000000000a'; parent uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select id into parent from public.repository_comments where content = 'top';
  insert into public.repository_comments (user_id, repo_full_name, parent_comment_id, content) values (a, 'octo/demo', parent, 'second reply');
  reset role;
  insert into r values ('4 rollback: a reply notifies through the restored rule', (select count(*) = 2 from public.repository_notifications where type = 'comment_reply'), null);
  insert into r values ('4 rollback: rows restored, stats function answers', (select count(*) from public.repository_bookmarks) = 1 and (select count(*) from public."user-data") = 1 and (public.get_repository_stats('octo/demo')->>'total_bookmarks')::int = 1, public.get_repository_stats('octo/demo')::text);
end $$;

-- The results, as an error so that everything above is rolled back.
do $$ begin raise exception 'R078-R103-TEST %', (select json_agg(json_build_object('step', step, 'ok', ok, 'detail', detail)) from r); end $$;
