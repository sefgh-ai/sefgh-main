-- R-078: four tables this application never reads had loose or no rules.
-- Anyone could add a repository_notifications row for any user, naming any
-- sender, and a repository_shares row under any user id; everyone could read
-- every user's repository_bookmarks; "user-data" had no policies at all.
-- The owner chose on 2026-10-28: drop the unused tables, backup first, but
-- keep repository_notifications for a later notifications feature.
--
-- Live definitions, read on 2026-10-28 (docs/database/user-db.md): rows
-- 0 notifications, 0 shares, 1 bookmark, 1 "user-data". Two functions use
-- the tables:
--
-- - create_reply_notification(), run by trigger_reply_notification after
--   each insert on repository_comments, adds a notification when someone
--   replies to another user's comment. It ran as the replying user, which is
--   why anyone could insert. It now runs with its owner's rights (postgres,
--   which owns the table), so the open insert rule can go and replies keep
--   notifying.
-- - get_repository_stats(text) counts bookmarks and shares. Nothing in this
--   repository or the Go backend calls it.
--
-- supabase/checks/r078_verify.sql confirms the result (read-only), and
-- supabase/checks/r078_rollback.sql undoes it from the backup. The statements
-- do not use "if exists": they were written against the live definitions, so
-- if one is missing the database has changed and the whole migration should
-- stop.

-- 1. Backup. A schema the API does not expose, closed to the API's roles.
create schema r078_backup;
revoke all on schema r078_backup from public, anon, authenticated;

create table r078_backup.repository_shares (like public.repository_shares including all);
insert into r078_backup.repository_shares select * from public.repository_shares;
create table r078_backup.repository_bookmarks (like public.repository_bookmarks including all);
insert into r078_backup.repository_bookmarks select * from public.repository_bookmarks;
create table r078_backup."user-data" (like public."user-data" including all);
insert into r078_backup."user-data" select * from public."user-data";

revoke all on all tables in schema r078_backup from public, anon, authenticated;

-- 2. Notifications stay; only the reply trigger writes them. Users keep
--    reading and marking their own.
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
-- Only the trigger runs it; Postgres checks this right when a trigger is
-- created, not when it fires.
revoke execute on function public.create_reply_notification() from public, anon, authenticated;
drop policy "System can insert notifications" on public.repository_notifications;

-- 3. The unused tables, and the function that reads two of them.
drop function public.get_repository_stats(text);
drop table public.repository_shares;
drop table public.repository_bookmarks;
drop table public."user-data";
