import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeTreeHash, stampPendingSync } from '../handoff-state.mjs';

function repository(t) {
  const root = mkdtempSync(join(tmpdir(), 'sefgh-handoff-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '--quiet');
  git('config', 'user.name', 'Handoff Test');
  git('config', 'user.email', 'test@example.invalid');
  writeFileSync(join(root, '.gitignore'), '.agent-signal.json\nignored/\n');
  writeFileSync(join(root, 'tracked.txt'), 'original\n');
  git('add', '.');
  git('-c', 'core.hooksPath=NUL', 'commit', '--quiet', '-m', 'fixture');
  return { root, git };
}

test('fingerprint changes when an untracked nested file is edited in place', (t) => {
  const { root } = repository(t);
  mkdirSync(join(root, 'new-package'));
  const path = join(root, 'new-package', 'handler.go');
  writeFileSync(path, 'first implementation');
  const before = computeTreeHash(root);
  assert.equal(computeTreeHash(root), before, 'stable for the same tree');
  writeFileSync(path, 'other implementation');
  assert.notEqual(computeTreeHash(root), before);
});

test('fingerprint covers new contract names containing spaces and Unicode', (t) => {
  const { root } = repository(t);
  const path = join(root, 'contract 日本 cases.json');
  writeFileSync(path, '{"status":200}');
  const before = computeTreeHash(root);
  writeFileSync(path, '{"status":401}');
  assert.notEqual(computeTreeHash(root), before);
});

test('fingerprint covers tracked, staged, added and removed files', (t) => {
  const { root, git } = repository(t);
  const before = computeTreeHash(root);
  writeFileSync(join(root, 'tracked.txt'), 'changed\n');
  assert.notEqual(computeTreeHash(root), before);
  git('add', 'tracked.txt');
  const staged = computeTreeHash(root);
  assert.notEqual(staged, before);
  writeFileSync(join(root, 'new.txt'), 'new');
  assert.notEqual(computeTreeHash(root), staged);
  rmSync(join(root, 'new.txt'));
  assert.equal(computeTreeHash(root), staged);
  rmSync(join(root, 'tracked.txt'));
  assert.notEqual(computeTreeHash(root), staged);
});

test('fingerprint ignores the signal and ignored local files', (t) => {
  const { root } = repository(t);
  const before = computeTreeHash(root);
  writeFileSync(join(root, '.agent-signal.json'), '{"timestamp":1}');
  writeFileSync(join(root, '.agent-verification.lock'), '{"synthetic":"advisory lease"}');
  mkdirSync(join(root, 'ignored'));
  writeFileSync(join(root, 'ignored', 'local.txt'), 'local-only');
  assert.equal(computeTreeHash(root), before);
});

test('a failed Git read fails verification instead of hashing empty output', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'sefgh-not-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => computeTreeHash(root));
});

test('pre-commit stamp explicitly remains uncommitted and unverified', () => {
  const stamped = stampPendingSync('Branch main. Resulting commit: uncommitted at handoff.\nGit Agent receipt, commit and push are not verified.', 'abc1234');
  assert.match(stamped, /Resulting commit: uncommitted;/);
  assert.match(stamped, /commit and synchronization pending/);
  assert.match(stamped, /receipt, commit and push are not verified/);
  assert.doesNotMatch(stamped, /synchronized by|Synchronized and verified/);
});

test('pre-commit stamp preserves an existing commit receipt', () => {
  const receipt = 'Resulting commit: `def5678`, verified in git log.\nOlder handoff unchanged.';
  assert.equal(stampPendingSync(receipt, 'abc1234'), receipt);
});

test('pre-commit stamp never rewrites older handoffs', () => {
  const current = '# Coordination\n## Current state\n- Active writer: none\n## Latest handoff\nResulting commit: `def5678`, verified.\n';
  const older = '## Previous handoff\nResulting commit: uncommitted at handoff.\n';
  assert.equal(stampPendingSync(current + older, 'abc1234'), current + older);
  const pending = current.replace('`def5678`, verified.', 'uncommitted at handoff.');
  const stamped = stampPendingSync(pending + older, 'abc1234');
  assert.match(stamped, /synchronization pending/);
  assert.ok(stamped.endsWith(older));
});
