// SEC-001 guard. The database lets browsers read only some profiles columns
// (bug register R-070: every user's email was readable by anyone). This test
// fails if:
//   - PROFILE_COLUMNS and the migration's column grant differ, or either
//     includes email;
//   - code in src/ asks profiles for `*`, for nothing (`.select()` means `*`),
//     or for a column outside PROFILE_COLUMNS.
// The database refuses such a query once the migration is applied, so each
// would be a broken page, not a leak.
//
// It reads the source; it does not run the app or the database. The
// migration itself was checked against a local copy of the live definitions;
// see docs/database/user-db.md.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Read as text: the app's .js files are ES modules only to Next.js.
const PROFILE_COLUMNS = readFileSync(join(root, 'src/lib/supabase/profile-columns.js'), 'utf8')
  .match(/export const PROFILE_COLUMNS = "([^"]*)";/)[1];
const MIGRATION = 'supabase/migrations/20261015140000_sec_001_close_data_exposures.sql';

// Columns asked for that are known to be wrong, each an open entry in
// docs/bug-register.md. When one is fixed, remove it here; the test fails
// until you do.
// The two Next.js handlers that still asked for username (R-075) were
// retired in P7-05.
const KNOWN = new Map();

const columns = (list) => list.split(',').map((c) => c.trim()).filter(Boolean);
const allowed = new Set(columns(PROFILE_COLUMNS));

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(js|jsx|ts|tsx|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

// Each `.from('profiles')` with the method calls chained after it: the rest of
// its line, then every following line that starts with a dot.
function profileChains(text) {
  const chains = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const at = line.search(/\.from\(\s*["'`]profiles["'`]\s*\)/);
    if (at < 0) return;
    let chain = line.slice(at);
    for (let j = i + 1; j < lines.length && lines[j].trim().startsWith('.'); j++) chain += lines[j].trim();
    chains.push({ line: i + 1, chain });
  });
  return chains;
}

// The argument of each .select( in a chain, as written.
function selects(chain) {
  const out = [];
  const re = /\.select\(/g;
  let match;
  while ((match = re.exec(chain))) {
    let depth = 1;
    let k = re.lastIndex;
    while (k < chain.length && depth) {
      if (chain[k] === '(') depth++;
      else if (chain[k] === ')') depth--;
      k++;
    }
    out.push(chain.slice(re.lastIndex, k - 1).trim());
  }
  return out;
}

test('PROFILE_COLUMNS matches the migration and leaves out email', () => {
  const sql = readFileSync(join(root, MIGRATION), 'utf8');
  const grant = sql.match(/grant select \(([^)]*)\)\s+on table public\.profiles to anon, authenticated;/);
  assert.ok(grant, 'the migration grants profiles columns to anon and authenticated');
  assert.deepEqual(new Set(columns(grant[1])), allowed);
  assert.ok(!allowed.has('email'));
  assert.match(sql, /revoke select on table public\.profiles from anon, authenticated;/);
});

test('code asks profiles only for granted columns', () => {
  const problems = [];
  const seen = new Set();
  for (const file of sourceFiles(join(root, 'src'))) {
    const rel = relative(root, file).split('\\').join('/');
    for (const { line, chain } of profileChains(readFileSync(file, 'utf8'))) {
      for (const arg of selects(chain)) {
        if (arg === 'PROFILE_COLUMNS') continue;
        const literal = arg.match(/^(["'`])([^"'`$]*)\1$/);
        if (!literal) {
          problems.push(`${rel}:${line} selects ${arg || 'nothing (every column)'}`);
          continue;
        }
        for (const column of columns(literal[2])) {
          if (allowed.has(column)) continue;
          const key = `${rel} ${column}`;
          if (KNOWN.has(key)) seen.add(key);
          else problems.push(`${rel}:${line} selects ${column}`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
  for (const [key, id] of KNOWN) assert.ok(seen.has(key), `${key} (${id}) no longer occurs; remove it from KNOWN`);
});

// R-040: the admin user lookup needs the service-role key, which the app never
// has, so it can only fail; were it ever to succeed it would hand out other
// users' emails. Authors are shown from their public profile only. The two
// Next.js route handlers keep their lookups until they are retired (Go answers
// both routes without one).
// The two Next.js handlers that kept the lookup were retired in P7-05.
const ADMIN_KNOWN = [];

test('no code asks Supabase Auth about another user (R-040)', () => {
  const found = sourceFiles(join(root, 'src'))
    .filter((file) => /auth\.admin\./.test(readFileSync(file, 'utf8')))
    .map((file) => file.slice(root.length).replace(/\\/g, '/'))
    .sort();
  assert.deepEqual(found, ADMIN_KNOWN);
});

test('a comment shows its author\'s name before any email (R-075)', () => {
  const section = readFileSync(join(root, 'src/components/repo-details/RepoCommentsSection.jsx'), 'utf8');
  assert.match(section, /\{comment\.user_name \|\| comment\.user_email\?\.split\('@'\)\[0\] \|\| 'Anonymous User'\}/);
});
