// Phase 6 guard (BUG-005): trending shows a real measure, stars per day since
// the repository was created, and nothing made up (bug register R-020). The
// route's replies are pinned by contracts/github-trending (version 2); this
// keeps the React UI guard; the retired measure helper is tested only in Go.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
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
