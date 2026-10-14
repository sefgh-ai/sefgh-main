// Phase 6 guard (BUG-006): every date and time the app shows is written
// the Indian way, the same on the server and in the browser (bug register
// R-061). A date call with no locale follows the machine, so a server in
// one country and a browser in another used to disagree.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { register } from 'node:module';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
register('./route-loader.mjs', import.meta.url);
const { formatDate } = await import('../../src/lib/utils/formatters.js');

const root = fileURLToPath(new URL('../../', import.meta.url));

test('dates read day, month, year', () => {
  const day = '2026-10-14T09:05:00Z';
  assert.equal(formatDate(day, { timeZone: 'UTC' }), '14 October 2026');
  assert.equal(formatDate(day, { month: 'short', timeZone: 'UTC' }), '14 Oct 2026');
  assert.equal(new Date(day).toLocaleDateString('en-IN', { timeZone: 'UTC' }), '14/10/2026');
  assert.equal(new Date(day).toLocaleTimeString('en-IN', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }), '9:05 am');
});

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const NOT_EN_IN = String.raw`\(\s*(?!["']en-IN["'])`;
const FORBIDDEN = [
  { why: 'a date call that is not en-IN', re: new RegExp(String.raw`\.toLocale(Date|Time)String` + NOT_EN_IN) },
  { why: 'a locale that is not en-IN', re: /\.toLocaleString\(\s*["'](?!en-IN["'])/ },
  // Reading the visitor's time zone formats nothing, so it is allowed.
  { why: 'a DateTimeFormat that is not en-IN', re: new RegExp(String.raw`DateTimeFormat` + NOT_EN_IN + String.raw`(?!\)\.resolvedOptions\(\))`) },
];

test('no app code formats dates its own way', () => {
  const found = [];
  for (const file of sourceFiles(join(root, 'src'))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      for (const { why, re } of FORBIDDEN) if (re.test(line)) found.push(`${relative(root, file)}:${i + 1} ${why}`);
    });
  }
  assert.deepEqual(found, []);
});
