import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const code = sql => sql.replace(/--[^\n]*/g, '');
const statements = sql => code(sql).split(';').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
const dropped = sql => statements(sql).flatMap(s => s.match(/^drop policy "([^"]+)" on storage\.objects$/i)?.[1] ?? []);
const created = sql => statements(sql).filter(s => /^create policy/i.test(s));

// R-186: anyone could list the avatars bucket. The migration must never
// bring back a read that is not limited to the signed-in user's own folder.
test('avatar migration: one own-folder read for signed-in users, no public read', async () => {
  const migration = await read('supabase/migrations/20261023120000_avatar_002_own_folder_reads.sql');
  assert.ok(!/if exists/i.test(code(migration)), 'written against the live definitions: stop if one is missing');
  assert.deepEqual(dropped(migration).sort(), [
    'Avatar images are publicly accessible', 'Avatars are publicly accessible',
    'Users can delete own avatars', 'Users can update own avatars', 'Users can upload avatars',
  ]);
  const [policy, ...others] = created(migration);
  assert.equal(others.length, 0, 'creates exactly one policy');
  assert.match(policy, /^create policy "Users can read their own avatars" on storage\.objects for select to authenticated using \(/i);
  assert.match(policy, /bucket_id = 'avatars' and \(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/);
  assert.ok(!/\bto (public|anon)\b/i.test(code(migration)));
});

test('avatar rollback restores exactly what the migration removed', async () => {
  const migration = await read('supabase/migrations/20261023120000_avatar_002_own_folder_reads.sql');
  const rollback = await read('supabase/checks/avatar_002_rollback.sql');
  assert.deepEqual(dropped(rollback), ['Users can read their own avatars']);
  const restored = created(rollback).map(s => s.match(/^create policy "([^"]+)"/i)[1]);
  assert.deepEqual(restored.sort(), dropped(migration).sort());
  // Every removed policy was recorded in the live read before it was written.
  const record = await read('docs/database/avatar-storage.md');
  for (const name of restored) assert.ok(record.includes(`"${name}"`), `${name} is not in the recorded live read`);
});

test('avatar verify query is read-only and checks reads, duplicates, writes and the bucket', async () => {
  const verify = await read('supabase/checks/avatar_002_verify.sql');
  assert.ok(verify.includes('20261023120000_avatar_002_own_folder_reads.sql'));
  const [only, ...rest] = statements(verify);
  assert.equal(rest.length, 0);
  assert.match(only, /^with\b/i);
  assert.ok(!/\b(?:insert|update|delete|create|alter|drop|grant|revoke|truncate)\b/i.test(only.replace(/'[^']*'/g, "''")));
  for (const label of ['signed out can read', 'own folder', 'one avatar policy per command', 'bucket is public']) {
    assert.ok(only.includes(label), `missing check: ${label}`);
  }
});
