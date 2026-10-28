-- Undoes supabase/migrations/20261028120000_r078_drop_unused_tables.sql
-- from its backup, restoring the definitions read on 2026-10-28, loose rules
-- (R-078) included. Run it only to recover from a fault the migration caused,
-- and only with the owner's approval. Run sections 1 to 3 together; section 4
-- only after the restored rows are confirmed.

-- 1. The tables and their rows. "like" copies columns, defaults, checks and
--    keys; references to other tables are added again by hand.
create table public.repository_shares (like r078_backup.repository_shares including all);
insert into public.repository_shares select * from r078_backup.repository_shares;
alter table public.repository_shares
  add constraint repository_shares_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

create table public.repository_bookmarks (like r078_backup.repository_bookmarks including all);
insert into public.repository_bookmarks select * from r078_backup.repository_bookmarks;
alter table public.repository_bookmarks
  add constraint repository_bookmarks_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

create table public."user-data" (like r078_backup."user-data" including all);
insert into public."user-data" select * from r078_backup."user-data";

grant all on table public.repository_shares, public.repository_bookmarks, public."user-data"
  to anon, authenticated, service_role;

-- 2. Rules, as they were.
alter table public.repository_shares enable row level security;
alter table public.repository_bookmarks enable row level security;
alter table public."user-data" enable row level security;

create policy "System can insert notifications" on public.repository_notifications
  for insert with check (true);
create policy "Users can insert shares" on public.repository_shares
  for insert with check (true);
create policy "Users can view all shares" on public.repository_shares
  for select using (true);
create policy "Users can delete own bookmarks" on public.repository_bookmarks
  for delete using (auth.uid() = user_id);
create policy "Users can insert own bookmarks" on public.repository_bookmarks
  for insert with check (auth.uid() = user_id);
create policy "Users can view all bookmarks" on public.repository_bookmarks
  for select using (true);

-- 3. The functions, as they were: the reply notification runs as the caller
--    again (the trigger itself was never changed).
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

-- 4. Only after the rows above are confirmed.
-- drop schema r078_backup cascade;
