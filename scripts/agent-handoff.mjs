#!/usr/bin/env node
/**
 * scripts/agent-handoff.mjs
 * 
 * Shared automation script for Claude Code, Codex, and Antigravity.
 * Runs all contract checks, Go tests, learn-go solutions, verifies
 * docs/coordination.md release state, and emits a structured handoff signal.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const GO_BIN_PATH = `${process.env.LOCALAPPDATA || ''}\\Programs\\Go\\bin`;
const PATH_WITH_GO = `${GO_BIN_PATH};${process.env.PATH || ''}`;

function run(cmd, cwd = ROOT, envExtra = {}) {
  console.log(`[handoff] > ${cmd}`);
  try {
    const out = execSync(cmd, {
      cwd,
      env: { ...process.env, PATH: PATH_WITH_GO, ...envExtra },
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: err.stdout || '', err: err.stderr || err.message };
  }
}

console.log('=== SEFGH Multi-Agent Handoff & Verification ===\n');

// 1. Run Contracts
console.log('1. Checking contract fixtures (npm run test:contracts)...');
const contracts = run('npm run test:contracts');
if (!contracts.ok) {
  console.error('❌ Contract tests failed:\n', contracts.err || contracts.out);
  process.exit(1);
}
console.log('✅ Contracts passed.');

// 2. Run Go Backend checks
console.log('\n2. Checking Go backend (go test, go vet, gofmt)...');
const goTest = run('go test -count=1 ./...', resolve(ROOT, 'backend'));
if (!goTest.ok) {
  console.error('❌ backend/ go test failed:\n', goTest.err || goTest.out);
  process.exit(1);
}
const goVet = run('go vet ./...', resolve(ROOT, 'backend'));
if (!goVet.ok) {
  console.error('❌ backend/ go vet failed:\n', goVet.err || goVet.out);
  process.exit(1);
}
const goFmt = run('gofmt -l .', resolve(ROOT, 'backend'));
if (!goFmt.ok || goFmt.out.trim().length > 0) {
  console.error('❌ backend/ gofmt unformatted files:\n', goFmt.out);
  process.exit(1);
}
console.log('✅ Go backend passed.');

// 3. Run learn-go solution tests
console.log('\n3. Checking learn-go solutions (go test -tags solution ./...)...');
const learnGo = run('go test -tags solution ./...', resolve(ROOT, 'learn-go'));
if (!learnGo.ok) {
  console.error('❌ learn-go solution tests failed:\n', learnGo.err || learnGo.out);
  process.exit(1);
}
console.log('✅ learn-go solutions passed.');

// 4. Inspect docs/coordination.md
console.log('\n4. Inspecting docs/coordination.md...');
const coordPath = resolve(ROOT, 'docs/coordination.md');
const coordContent = readFileSync(coordPath, 'utf-8');

// Strictly match the current state bullet: "- **Active writer:** none"
const activeWriterMatch = coordContent.match(/^-\s+\*\*Active writer:\*\*\s*(.+)$/m);
const activeWriter = activeWriterMatch ? activeWriterMatch[1].trim() : 'unknown';
const isReleased = /^none\b/i.test(activeWriter);

if (!isReleased) {
  console.warn(`⚠️ Warning: Current active writer is: "${activeWriter}". Writer role has NOT been released to "none".`);
} else {
  console.log('✅ docs/coordination.md records: Active writer is "none" (writer released).');
}

// 5. Emit status file for background watcher / Antigravity agent
const signal = {
  timestamp: new Date().toISOString(),
  contractsPassed: true,
  goBackendPassed: true,
  learnGoPassed: true,
  writerReleased: isReleased,
  gitHead: run('git rev-parse HEAD').out.trim(),
  gitBranch: run('git rev-parse --abbrev-ref HEAD').out.trim(),
};

writeFileSync(resolve(ROOT, '.agent-signal.json'), JSON.stringify(signal, null, 2), 'utf-8');
console.log('\n✅ Verification complete. Emitted .agent-signal.json');
console.log('Ready for Git Agent commit, synchronization, and merge.');

