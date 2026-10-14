// Phase 6 guard (BUG-006): two documentation claims that had gone stale
// stay corrected (bug register R-046, R-047).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

function goFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) goFiles(path, out);
    else if (name.endsWith('.go')) out.push(path);
  }
  return out;
}

test('no Go file claims a generator the repository does not have', () => {
  // Go tools treat this header as "made by a program, do not edit". There
  // is no such program here; the copied files say how they are kept in step.
  const claims = goFiles(join(root, 'backend'))
    .filter((file) => /^\/\/ Code generated .* DO NOT EDIT\.$/m.test(readFileSync(file, 'utf8')))
    .map((file) => relative(root, file));
  assert.deepEqual(claims, []);
});

test('the repositories contract does not describe the server token AUTH-001 removed', () => {
  const readme = readFileSync(join(root, 'contracts/github-repositories/README.md'), 'utf8');
  assert.doesNotMatch(readme, /optional server bearer token/);
  assert.doesNotMatch(readme, /send the server token for any caller\. If/);
});
