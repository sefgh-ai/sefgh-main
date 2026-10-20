import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('key preflight is read-only and covers all three actual playground tables', async () => {
  const source = await readFile(new URL('../../supabase/checks/keys_001_catalog.sql', import.meta.url), 'utf8');
  const statements = source.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
  assert.match(statements[0], /^begin transaction read only$/i);
  assert.match(statements.at(-1), /^commit$/i);
  const selects = statements.slice(1, -1);
  assert.equal(selects.length, 6, 'columns, tables/grants, policies, constraints, triggers, functions');
  for (const sql of selects) {
    assert.match(sql, /^select\b/i);
    assert.ok(!/\b(?:from|join)\s+public\./i.test(sql), 'never read playground rows or key values');
  }
  for (const [i, sql] of selects.slice(0, 5).entries()) {
    for (const table of ['api_keys', 'api_limits', 'api_logs']) assert.ok(sql.includes(`'${table}'`), `catalog section ${i + 1} omits ${table}`);
  }
});
