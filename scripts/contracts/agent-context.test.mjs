// Checks on the files agents load and run at the start of a session
// (AGENT-AUDIT-001): the SessionStart hook reports the session's own checkout
// (R-233), the coordination brief stays small and correct (R-234), and the
// always-loaded instruction file stays within a budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brief, splitCoordination } from '../coordination-brief.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const hook = join(repo, 'scripts', 'session-start-status.mjs');

function checkout(label) {
  const root = mkdtempSync(join(resolve(tmpdir()), `sefgh-ctx-${label}-`));
  mkdirSync(join(root, 'docs'));
  writeFileSync(join(root, '.gitignore'), '.agent-signal.json\n.agent-verification.lock\n');
  writeFileSync(join(root, 'docs', 'coordination.md'),
    `## Current state\n- **Active writer:** none\n## Handoff: ${label}\nStatus: complete\n`);
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe', windowsHide: true });
  git('init', '--quiet'); git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
    '-c', `core.hooksPath=${join(root, 'no-hooks')}`, 'commit', '--quiet', '-m', 'fixture');
  return root;
}

test('SessionStart hook reports the checkout named by the hook input, not CLAUDE_PROJECT_DIR (R-233)', () => {
  const main = checkout('main'), worktree = checkout('worktree');
  try {
    const run = spawnSync(process.execPath, [hook], {
      cwd: main, input: JSON.stringify({ cwd: worktree }), encoding: 'utf8', timeout: 60000, windowsHide: true,
      env: { ...process.env, CLAUDE_PROJECT_DIR: main },
    });
    assert.equal(run.status, 0, run.stderr);
    const context = JSON.parse(run.stdout).hookSpecificOutput.additionalContext;
    assert.match(context, /latest handoff: Handoff: worktree\b/);
    assert.doesNotMatch(context, /Handoff: main\b/);
    assert.ok(context.replaceAll('\\', '/').toLowerCase().includes(worktree.replaceAll('\\', '/').toLowerCase()),
      'the summary names the checkout it read');
  } finally { rmSync(main, { recursive: true, force: true }); rmSync(worktree, { recursive: true, force: true }); }
});

test('SessionStart hook falls back to CLAUDE_PROJECT_DIR when the input names no checkout', () => {
  const main = checkout('main'), outside = mkdtempSync(join(resolve(tmpdir()), 'sefgh-ctx-outside-'));
  try {
    const run = spawnSync(process.execPath, [hook], {
      cwd: outside, input: '{}', encoding: 'utf8', timeout: 60000, windowsHide: true,
      env: { ...process.env, CLAUDE_PROJECT_DIR: main },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(JSON.parse(run.stdout).hookSpecificOutput.additionalContext, /latest handoff: Handoff: main\b/);
  } finally { rmSync(main, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test('coordination brief returns the preamble and only the newest records (R-234)', () => {
  const doc = '# Title\n\n## Start here\nintro\n\n## Current state\n- **Active writer:** none\n\n'
    + '## Handoff: C-3 newest\nthree\n\n## Checkpoint: B-2\ntwo\n\n## Handoff: A-1 oldest\none\n';
  assert.deepEqual(splitCoordination(doc).records.map((r) => r.heading),
    ['Handoff: C-3 newest', 'Checkpoint: B-2', 'Handoff: A-1 oldest']);
  const two = brief(doc);
  assert.match(two, /## Start here/); assert.match(two, /Active writer/);
  assert.match(two, /three/); assert.match(two, /two/); assert.doesNotMatch(two, /\none\n/);
  const named = brief(doc, 'a-1');
  assert.match(named, /\none\n/); assert.doesNotMatch(named, /three/); assert.doesNotMatch(named, /Start here/);
  assert.equal(brief(doc, '--list'), 'Handoff: C-3 newest\nCheckpoint: B-2\nHandoff: A-1 oldest');
});

test('the real coordination brief and AGENTS.md fit an agent\'s start-of-task budget', () => {
  const coordination = readFileSync(join(repo, 'docs', 'coordination.md'), 'utf8');
  const out = brief(coordination);
  // Roughly 4 characters per token: 60,000 characters is about 15,000 tokens.
  assert.ok(out.length < 60000, `npm run brief prints ${out.length} characters; shorten the newest records or "Current state"`);
  assert.match(out, /\*\*Active writer:\*\*/);
  const agents = readFileSync(join(repo, 'AGENTS.md'), 'utf8');
  assert.ok(agents.length < 14000, `AGENTS.md is ${agents.length} characters and is loaded into every session; move detail into docs/`);
  assert.match(agents, /npm run brief/);
});
