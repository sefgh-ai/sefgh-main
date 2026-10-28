-- R-078: four tables this application never uses had loose or no rules.
-- Anyone could add a repository_notifications row for any user, naming any
-- sender, and a repository_shares row under any user id; everyone could read
-- every user's repository_bookmarks; "user-data" had no policies at all.
-- The owner chose option A on 2026-10-28: drop the four tables, backup first.
--
-- Live definitions, read on 2026-10-28 (docs/database/user-db.md): rows
-- 0 notifications, 0 shares, 1 bookmark, 1 "user-data". Nothing references
-- the tables except two functions, handled below:
--
-- - create_reply_notification(), run by trigger_reply_notification on
--   repository_comments, inserts a notification whenever someone replies to
--   another user's comment. Dropping the table alone would make those replies
--   fail, so the trigger and its function go first. Nothing shows
--   notifications, so replies lose nothing a user can see.
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

create table r078_backup.repository_notifications (like public.repository_notifications including all);
insert into r078_backup.repository_notifications select * from public.repository_notifications;
create table r078_backup.repository_shares (like public.repository_shares including all);
insert into r078_backup.repository_shares select * from public.repository_shares;
create table r078_backup.repository_bookmarks (like public.repository_bookmarks including all);
insert into r078_backup.repository_bookmarks select * from public.repository_bookmarks;
create table r078_backup."user-data" (like public."user-data" including all);
insert into r078_backup."user-data" select * from public."user-data";

revoke all on all tables in schema r078_backup from public, anon, authenticated;

-- 2. What writes or reads the tables.
drop trigger trigger_reply_notification on public.repository_comments;
drop function public.create_reply_notification();
drop function public.get_repository_stats(text);

-- 3. The tables.
drop table public.repository_notifications;
drop table public.repository_shares;
drop table public.repository_bookmarks;
drop table public."user-data";
