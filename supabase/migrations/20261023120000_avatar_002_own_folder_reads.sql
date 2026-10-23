-- AVATAR-POLICY-002: anyone could list the avatars bucket (R-186). The
-- live definitions, read on 2026-10-23, and the owner's choice (option A)
-- are in docs/database/avatar-storage.md.
--
-- No app change is needed first. Avatar links use the public-bucket URL,
-- which Storage serves without these policies, and every Storage call the
-- app makes (upload with upsert, list, remove) stays inside the caller's own
-- folder. That holds for this repository and for the code the live site
-- runs (R-066).
-- supabase/checks/avatar_002_verify.sql confirms the result (read-only), and
-- supabase/checks/avatar_002_rollback.sql undoes it.
--
-- The statements do not use "if exists": they were written against the live
-- definitions, so if one is missing the database has changed and the whole
-- migration should stop. Run as postgres: supautils lets that role manage
-- policies on storage.objects, which supabase_storage_admin owns.

-- 1. Reads (R-186). Both SELECT policies allowed every role, signed out
--    included, to read and list every object in the bucket. A signed-in user
--    now reads only their own folder, which upsert and cleanup need.
drop policy "Avatar images are publicly accessible" on storage.objects;
drop policy "Avatars are publicly accessible" on storage.objects;
create policy "Users can read their own avatars"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- 2. Duplicates. Each write policy existed twice with the same condition;
--    keep the "their own avatar" copy of each.
drop policy "Users can upload avatars" on storage.objects;
drop policy "Users can update own avatars" on storage.objects;
drop policy "Users can delete own avatars" on storage.objects;
