import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('avatar Storage read is read-only and returns definitions and counts only', async () => {
  const source = await readFile(new URL('../../supabase/checks/avatar_storage_catalog.sql', import.meta.url), 'utf8');
  const statements = source.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
  assert.match(statements[0], /^begin transaction read only$/i);
  assert.match(statements.at(-1), /^commit$/i);
  const selects = statements.slice(1, -1);
  for (const sql of selects) {
    assert.match(sql, /^select\b/i);
    const code = sql.replace(/'[^']*'/g, "''");
    assert.ok(!/\b(?:insert|update|delete|create|alter|drop|grant|revoke|truncate)\b/i.test(code), `not read-only: ${sql}`);
    assert.ok(!/\b(?:from|join)\s+public\./i.test(code), 'never read application rows');
    // Object names are user ids plus file names: these may only be counted.
    if (/\b(?:storage\.objects|auth\.users)\b/i.test(code)) {
      const outer = code.slice('select'.length, code.search(/\bfrom\b/i));
      for (const column of outer.split(',')) assert.match(column.trim(), /^count\(/i, `returns more than a count: ${column.trim()}`);
    }
  }
  const bucket = selects.find(sql => /\bfrom storage\.buckets\b/i.test(sql));
  for (const column of ['public', 'file_size_limit', 'allowed_mime_types']) assert.ok(bucket?.includes(column), `bucket settings omit ${column}`);
  const policies = selects.find(sql => /pg_policies/.test(sql) && /'storage'/.test(sql));
  for (const table of ['objects', 'buckets']) assert.ok(policies?.includes(`'${table}'`), `Storage policies omit ${table}`);
});
