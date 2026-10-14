// Phase 6 guard (BUG-004): every number the app shows uses Indian grouping,
// the same on the server and in the browser (bug register R-053).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { register } from 'node:module';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
register('./route-loader.mjs', import.meta.url);
const { formatNumber, formatCompactNumber } = await import('../../src/lib/utils/formatters.js');
const usageStats = await import('../../src/lib/usageStats.js');

const root = fileURLToPath(new URL('../../', import.meta.url));

test('full numbers use Indian grouping', () => {
  const cases = [[0, '0'], [999, '999'], [1000, '1,000'], [120000, '1,20,000'], [1234567, '12,34,567'], [-120000, '-1,20,000'], [NaN, '0'], [undefined, '0'], ['120000', '1,20,000']];
  for (const [input, want] of cases) assert.equal(formatNumber(input), want, String(input));
  assert.equal(usageStats.formatNumber(120000), '1,20,000', 'the usage card uses the same formatter');
});

test('short numbers use thousand, lakh and crore, cut and never rounded up', () => {
  const cases = [
    [0, '0'], [7, '7'], [999, '999'], [1000, '1K'], [1234, '1.2K'], [99999, '99.9K'],
    [100000, '1L'], [120000, '1.2L'], [1234567, '12.3L'], [9999999, '99.9L'],
    [10000000, '1Cr'], [12345678, '1.2Cr'], [15000000000, '1,500Cr'], [-1234, '-1.2K'],
    [NaN, '0'], [null, '0'],
  ];
  for (const [input, want] of cases) assert.equal(formatCompactNumber(input), want, String(input));
});

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

// What used to make the server and the browser disagree, or bypass the
// shared formatters.
const FORBIDDEN = [
  { why: 'toLocaleString() with no locale follows the machine', re: /\.toLocaleString\(\s*\)/ },
  { why: 'a NumberFormat that is not en-IN', re: /NumberFormat\(\s*(?!["']en-IN["'])/ },
  { why: 'a hand-made "k" or "M" abbreviation; use formatCompactNumber', re: /\)\s*\+\s*["'][kKM]["']|\}[kKM]`|\.toFixed\(1\)\s*\+\s*["'][kKM]/ },
];

test('no app code formats numbers its own way', () => {
  const found = [];
  for (const file of sourceFiles(join(root, 'src'))) {
    if (file.endsWith(join('lib', 'utils', 'formatters.js'))) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { why, re } of FORBIDDEN) if (re.test(line)) found.push(`${relative(root, file)}:${i + 1} ${why}`);
    });
  }
  assert.deepEqual(found, []);
});
