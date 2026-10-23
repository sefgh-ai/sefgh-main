import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { acquireVerificationLease, releaseVerificationLease, verificationLeaseState } from '../handoff-lease.mjs';

const script = fileURLToPath(new URL('../agent-handoff.mjs', import.meta.url));
function fixture() {
  const temp = resolve(tmpdir()), root = mkdtempSync(join(temp, 'sefgh-handoff-race-'));
  const bin = join(root, 'Programs', 'Go', 'bin'); mkdirSync(bin, { recursive: true });
  for (const name of ['backend', 'docs']) mkdirSync(join(root, name));
  writeFileSync(join(root, '.gitignore'), '.agent-signal.json\n.agent-verification.lock\n.started\n.release\n.status-started\n.status-release\n.calls\n');
  writeFileSync(join(root, 'docs', 'coordination.md'), '## Current state\n- **Active writer:** none\n## Handoff: fixture\nStatus: complete\nResulting commit: uncommitted at handoff.\n');
  const helper = join(root, 'command.cjs');
  writeFileSync(helper, `const fs=require('node:fs');const path=require('node:path');const root=${JSON.stringify(root)};
fs.appendFileSync(path.join(root,'.calls'),process.argv[2]+'\\n');
if(process.argv[2]==='npm'){fs.writeFileSync(path.join(root,'.started'),'ready');const until=Date.now()+25000;const timer=setInterval(()=>{if(fs.existsSync(path.join(root,'.release')))clearInterval(timer);else if(Date.now()>until){clearInterval(timer);process.exitCode=41;}},20);}`);
  const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
  for (const role of ['npm', 'go', 'gofmt']) {
    writeFileSync(join(bin, role + (process.platform === 'win32' ? '.cmd' : '')),
      process.platform === 'win32' ? `@echo off\r\n"${process.execPath}" "${helper}" ${role} %*\r\n` :
        `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(helper)} ${quote(role)} "$@"\n`, { mode: 0o700 });
  }
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe', windowsHide: true });
  git('init', '--quiet'); git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
    '-c', 'core.hooksPath=' + join(root, 'no-hooks'), 'commit', '--quiet', '-m', 'fixture');
  writeFileSync(join(root, 'pending.txt'), 'before verification');
  const options = { cwd: root, env: { ...process.env, LOCALAPPDATA: root, PATH: bin + delimiter + process.env.PATH },
    windowsHide: true, encoding: 'utf8' };
  return { root,
    run: args => spawnSync(process.execPath, [script, ...args], { ...options, timeout: 20000 }),
    start: (args = [], env = {}) => {
      const child = spawn(process.execPath, [script, ...args], { ...options, env: { ...options.env, ...env } }); let output = '';
      child.stdout.on('data', bytes => { output += bytes; }); child.stderr.on('data', bytes => { output += bytes; });
      const done = new Promise((resolveDone, reject) => { child.once('error', reject); child.once('close', code => resolveDone({ code, output })); });
      return { child, done };
    },
    release: () => writeFileSync(join(root, '.release'), 'continue'),
    pauseStatusReads: () => {
      const gitHelper = join(root, 'git-command.cjs');
      writeFileSync(gitHelper, `const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');const root=${JSON.stringify(root)};
function run(){const r=spawnSync('git',process.argv.slice(2),{env:{...process.env,PATH:${JSON.stringify(process.env.PATH)}},encoding:'utf8',windowsHide:true});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exitCode=r.status??1;}
if(process.env.HANDOFF_FIXTURE_PAUSE_STATUS==='1'&&process.argv[2]==='rev-parse'&&process.argv[3]==='--abbrev-ref'){fs.writeFileSync(path.join(root,'.status-started'),'ready');const until=Date.now()+25000;const timer=setInterval(()=>{if(fs.existsSync(path.join(root,'.status-release'))){clearInterval(timer);run();}else if(Date.now()>until){clearInterval(timer);process.exitCode=42;}},20);}else run();`);
      writeFileSync(join(bin, 'git' + (process.platform === 'win32' ? '.cmd' : '')),
        process.platform === 'win32' ? `@echo off\r\n"${process.execPath}" "${gitHelper}" %*\r\n` :
          `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(gitHelper)} "$@"\n`, { mode: 0o700 });
    },
    resumeStatus: () => writeFileSync(join(root, '.status-release'), 'continue'),
    statusReady: async () => { const until = Date.now() + 15000; while (!existsSync(join(root, '.status-started'))) {
      if (Date.now() > until) throw new Error('fixture status did not reach its pause'); await delay(20);
    } },
    ready: async () => { const until = Date.now() + 15000; while (!existsSync(join(root, '.started'))) {
      if (Date.now() > until) throw new Error('fixture verification did not start'); await delay(20);
    } },
    close: () => { assert.ok(resolve(root).startsWith(temp + sep)); rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); },
  };
}

test('an active verifier blocks watcher synchronization, stamping and competing verification', async () => {
  const f = fixture(), started = f.start();
  try {
    await f.ready();
    const status = JSON.parse(f.run(['--status']).stdout);
    assert.equal(status.state, 'VERIFICATION_BUSY'); assert.equal(status.canSynchronize, false);
    const before = readFileSync(join(f.root, 'docs', 'coordination.md'), 'utf8');
    assert.equal(f.run(['--stamp-sync']).status, 1);
    assert.equal(readFileSync(join(f.root, 'docs', 'coordination.md'), 'utf8'), before);
    writeFileSync(join(f.root, '.agent-signal.json'), '{"synthetic":"preserve during refused competing run"}');
    const competing = f.run([]); assert.equal(competing.status, 1); assert.match(competing.stderr, /verification lease/i);
    assert.match(readFileSync(join(f.root, '.agent-signal.json'), 'utf8'), /preserve during refused/);
    f.release(); const result = await started.done; assert.equal(result.code, 0, result.output);
    assert.equal(existsSync(join(f.root, '.agent-verification.lock')), false);
    assert.equal(JSON.parse(f.run(['--status']).stdout).state, 'READY_VERIFIED');
  } finally { f.release(); await started.done; f.close(); }
});

test('a status request started before lease acquisition rechecks it after slow Git reads', async () => {
  const f = fixture(); let status, verifier;
  try {
    f.pauseStatusReads(); f.release(); assert.equal(f.run([]).status, 0);
    rmSync(join(f.root, '.release')); rmSync(join(f.root, '.started'));
    status = f.start(['--status'], { HANDOFF_FIXTURE_PAUSE_STATUS: '1' }); await f.statusReady();
    verifier = f.start(); await f.ready();
    assert.equal(existsSync(join(f.root, '.agent-verification.lock')), true);
    f.resumeStatus(); const result = await status.done;
    assert.equal(result.code, 0, result.output);
    const output = JSON.parse(result.output);
    assert.equal(output.state, 'VERIFICATION_BUSY'); assert.equal(output.canSynchronize, false);
    assert.equal(output.verification.present, true); assert.equal(output.signalMatchesTree, false);
  } finally { f.resumeStatus(); f.release(); if (status) await status.done; if (verifier) await verifier.done; f.close(); }
});

test('failed Git status cannot be interpreted as a clean synchronization-ready tree', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, '.git', 'index'), 'CORRUPTED_FIXTURE_INDEX');
    const result = f.run(['--status']);
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.state, 'STATUS_ERROR'); assert.equal(output.canSynchronize, false);
    assert.equal(output.workingTreeClean, null); assert.equal(output.signalMatchesTree, false);
  } finally { f.close(); }
});

test('source changes during verification cannot receive a success fingerprint', async () => {
  const f = fixture(), started = f.start();
  try {
    await f.ready(); writeFileSync(join(f.root, 'pending.txt'), 'changed while checks were running');
    f.release(); const result = await started.done;
    assert.equal(result.code, 1, result.output); assert.match(result.output, /source changed during verification/i);
    assert.equal(existsSync(join(f.root, '.agent-signal.json')), false);
    assert.equal(existsSync(join(f.root, '.agent-verification.lock')), false);
  } finally { f.release(); await started.done; f.close(); }
});

test('unknown and malformed leases fail closed without executing checks or replacing their files', () => {
  const f = fixture();
  try {
    const path = join(f.root, '.agent-verification.lock'); writeFileSync(path, 'unknown interrupted lease');
    rmSync(join(f.root, 'pending.txt'));
    const status = JSON.parse(f.run(['--status']).stdout);
    assert.equal(status.state, 'VERIFICATION_BUSY'); assert.equal(status.canSynchronize, false);
    assert.equal(status.workingTreeClean, true, 'even a clean source tree cannot clear an unknown lease');
    assert.equal(f.run([]).status, 1); assert.equal(f.run(['--stamp-sync']).status, 1);
    assert.equal(readFileSync(path, 'utf8'), 'unknown interrupted lease');
    assert.equal(existsSync(join(f.root, '.calls')), false);
  } finally { f.close(); }
});

test('synchronization stamps preserve coordination while a writer owns the task or its checkpoint is paused', () => {
  const f = fixture();
  try {
    const path = join(f.root, 'docs', 'coordination.md');
    for (const [writer, status] of [['Codex', 'complete'], ['none', 'paused / incomplete']]) {
      const text = `## Current state\n- **Active writer:** ${writer}\n## Checkpoint\nStatus: ${status}\nResulting commit: uncommitted at handoff.\n`;
      writeFileSync(path, text);
      assert.equal(f.run(['--stamp-sync']).status, 1);
      assert.equal(readFileSync(path, 'utf8'), text);
      assert.equal(existsSync(join(f.root, '.agent-verification.lock')), false);
    }
    assert.equal(existsSync(join(f.root, '.calls')), false);
  } finally { f.close(); }
});

test('lease release requires the same process and nonce and cannot remove a replaced lease', () => {
  const f = fixture();
  try {
    const lease = acquireVerificationLease(f.root);
    assert.equal(verificationLeaseState(f.root).present, true);
    assert.throws(() => acquireVerificationLease(f.root), /verification lease/i);
    assert.equal(releaseVerificationLease(f.root, { ...lease, nonce: '00000000-0000-0000-0000-000000000000' }), false);
    assert.equal(verificationLeaseState(f.root).present, true);
    assert.equal(releaseVerificationLease(f.root, lease), true);
    const replacement = { ...lease, nonce: '11111111-1111-4111-8111-111111111111', pid: process.pid + 1 };
    writeFileSync(join(f.root, '.agent-verification.lock'), JSON.stringify(replacement));
    assert.equal(releaseVerificationLease(f.root, lease), false);
    assert.deepEqual(JSON.parse(readFileSync(join(f.root, '.agent-verification.lock'), 'utf8')), replacement);
  } finally { f.close(); }
});
