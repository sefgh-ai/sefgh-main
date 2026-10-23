-- Undoes supabase/migrations/20261023120000_avatar_002_own_folder_reads.sql,
-- restoring the definitions read on 2026-10-23, exposure (R-186) and
-- duplicates included. Run it only to recover from a fault the migration
-- caused, and only with the owner's approval. Each section can be run alone.

-- 1. Reads: every role may read and list the bucket again.
drop policy "Users can read their own avatars" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "Avatars are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

-- 2. The duplicate write policies.
create policy "Users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update own avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete own avatars"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
