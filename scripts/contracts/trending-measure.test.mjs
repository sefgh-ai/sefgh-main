// Phase 6 guard (BUG-005): trending shows a real measure, stars per day since
// the repository was created, and nothing made up (bug register R-020). The
// route's replies are pinned by contracts/github-trending (version 2); this
// covers the shared function the page also uses, and the page's own code.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { register } from 'node:module';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
register('./route-loader.mjs', import.meta.url);
const { starsPerDay, heatLevel } = await import('../../src/lib/utils/trending/trendingMeasure.js');

const root = fileURLToPath(new URL('../../', import.meta.url));
const NOW = Date.parse('2026-10-13T12:00:00Z');

test('stars per day: whole days, at least one, rounded down', () => {
  assert.equal(starsPerDay(120, '2026-10-12T12:00:00Z', NOW), 120);
  assert.equal(starsPerDay(300, '2026-10-13T10:00:00Z', NOW), 300, 'under a day counts as one');
  assert.equal(starsPerDay(100, '2026-10-10T12:00:00Z', NOW), 33);
  assert.equal(starsPerDay(150, '2026-10-14T12:00:00Z', NOW), 150, 'a future creation time counts as one day');
  // An old repository from the curated list: its lifetime average.
  assert.equal(starsPerDay(228000, '2013-05-24T16:15:54Z', NOW), 46);
});

test('stars per day: null without a usable count or creation time', () => {
  for (const [stars, createdAt] of [[120, '2026-10-12'], [120, '2026-10-12T12:00:00+05:30'], [120, undefined], ['120', '2026-10-12T12:00:00Z'], [Infinity, '2026-10-12T12:00:00Z'], [120, '2026-13-45T25:61:61Z']]) {
    assert.equal(starsPerDay(stars, createdAt, NOW), null, `${stars} ${createdAt}`);
  }
});

test('heat level follows the measure, not the position in a list', () => {
  for (const [perDay, level] of [[null, 1], [undefined, 1], [0, 1], [24, 1], [25, 2], [99, 2], [100, 3], [5000, 3]]) {
    assert.equal(heatLevel(perDay), level, String(perDay));
  }
});

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

test('nothing in the trending code is made up', () => {
  const found = [];
  for (const file of sourceFiles(join(root, 'src'))) {
    const rel = relative(root, file).split('\\').join('/');
    const text = readFileSync(file, 'utf8');
    if (/starsToday\s*:/.test(text)) found.push(`${rel}: a starsToday value`);
    if (/trending/i.test(rel) && /Math\.random\(/.test(text)) found.push(`${rel}: Math.random`);
    if (/trending/i.test(rel) && /getMock|mockRepos|mockDevelopers/.test(text)) found.push(`${rel}: mock data`);
  }
  assert.deepEqual(found, []);
});
