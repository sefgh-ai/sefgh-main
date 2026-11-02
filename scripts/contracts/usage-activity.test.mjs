// Phase 6 guard (BUG-003): the profile's usage card shows the user's real
// activity from GET /api/activity. It used to show generated mock data for a
// fixed year (bug register R-006).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { register } from 'node:module';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
register('./route-loader.mjs', import.meta.url);
const { usageDaysFromActivity, normalizeUsageDays, computeUsageStats } = await import('../../src/lib/usageStats.js');

const root = fileURLToPath(new URL('../../', import.meta.url));

test('days are read from the activity grid, leaving out the padding', () => {
  // The shape GET /api/activity answers with (Go since P7-04): weeks of days, the
  // last week padded with days that have no date.
  const reply = {
    grid: [
      [{ date: '2026-10-04', count: 0 }, { date: '2026-10-05', count: 3 }, { date: '2026-10-06', count: 1 }],
      [{ date: '2026-10-11', count: 2 }, { date: '', count: 0 }, { date: '', count: 0 }],
    ],
    stats: { totalContributions: 6 },
  };
  assert.deepEqual(usageDaysFromActivity(reply), [
    { date: '2026-10-04', count: 0 },
    { date: '2026-10-05', count: 3 },
    { date: '2026-10-06', count: 1 },
    { date: '2026-10-11', count: 2 },
  ]);
  const stats = computeUsageStats(normalizeUsageDays(usageDaysFromActivity(reply)));
  assert.equal(stats.totalCount, 6, 'the card counts what the API counted');
});

test('a malformed reply counts as no activity, never as invented activity', () => {
  for (const reply of [null, {}, { grid: 'x' }, { grid: [[null, 5, { count: 3 }]] }]) {
    assert.deepEqual(usageDaysFromActivity(reply), [], JSON.stringify(reply));
  }
  assert.deepEqual(usageDaysFromActivity({ grid: [[{ date: '2026-10-05', count: 'many' }]] }), [{ date: '2026-10-05', count: 0 }]);
});

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

test('no app code uses the mock usage generator', () => {
  const users = sourceFiles(join(root, 'src'))
    .filter((file) => !file.endsWith('mockUsageData.js'))
    .filter((file) => /mockUsageData/.test(readFileSync(file, 'utf8')))
    .map((file) => relative(root, file));
  assert.deepEqual(users, []);
});

test('the usage card asks /api/activity and the profile does not pin a year', () => {
  const card = readFileSync(join(root, 'src/components/usage-contributions/UsageContributionsCard.jsx'), 'utf8');
  // With the session bearer, which the Go port needs (ACT-002).
  assert.match(card, /fetchWithSession\('\/api\/activity'/);
  const profile = readFileSync(join(root, 'src/app/profile/page.js'), 'utf8');
  assert.doesNotMatch(profile, /<UsageContributionsCard[^>]*year=/);
});
