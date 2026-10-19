// Phase 6 guard (BUG-010): a Data API count with { head: true } answers no
// rows, only a count, so its result's `data` is null. The playground's
// limits tab read `data?.length` from three such counts and always showed
// 0 requests (R-105). Every head count in src/ must take `count` from its
// result.
//
// It reads the source; it does not run the app. A head count whose result is
// not destructured where it is awaited is reported too, so it can be checked.
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
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

// The statement a head count is in, back to the last ";" or blank line
// before it: enough for the `const { ... } = await supabase ...` chains the
// code uses.
function statementBefore(text, index) {
  const start = Math.max(text.lastIndexOf(';', index), text.lastIndexOf('\n\n', index));
  return text.slice(start + 1, index);
}

test('every head count reads count, not data (R-105)', () => {
  const wrong = [];
  let seen = 0;
  for (const file of sourceFiles(join(root, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/head:\s*true/g)) {
      seen++;
      const at = `${relative(root, file).split('\\').join('/')}:${text.slice(0, m.index).split('\n').length}`;
      const taken = statementBefore(text, m.index).match(/const\s*\{([^}]*)\}\s*=\s*await\b/);
      if (!taken) wrong.push(`${at} (result not destructured)`);
      else if (!/(^|[\s,])count\b/.test(taken[1])) wrong.push(`${at} takes {${taken[1].trim()}}`);
    }
  }
  assert.ok(seen > 0, 'no head counts found; the scan is broken');
  assert.deepEqual(wrong, []);
});
