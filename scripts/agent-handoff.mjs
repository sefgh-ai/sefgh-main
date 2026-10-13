#!/usr/bin/env node
/**
 * scripts/agent-handoff.mjs
 *
 * Shared automation & verification pipeline for Claude Code, Codex, and the Git Agent.
 *
 * Modes:
 * - Default (`npm run handoff`):
 *   1. Runs contract tests, Go backend tests/vet/gofmt, and learn-go solution tests.
 *   2. Verifies `docs/coordination.md` has `Active writer: none` and that the latest
 *      checkpoint/handoff is NOT marked `paused` or `incomplete`.
 *   3. Computes a SHA-256 working-tree fingerprint (`treeHash`) so the Git Agent can
 *      verify nothing changed after the handoff run and skip redundant test runs.
 *   4. Emits `.agent-signal.json`.
 *
 * - `--status` (`node scripts/agent-handoff.mjs --status [--ci]`):
 *   Fast read-only status probe for the Git Agent watcher. Prints JSON with:
 *   - `state`: "IDLE_CLEAN" | "WRITER_ACTIVE" | "PAUSED_CHECKPOINT" | "READY_VERIFIED" | "READY_NEEDS_VERIFY"
 *   - `activeWriter`, `latestHeading`, `latestStatus`, `treeHash`, `signalMatchesTree`
 *   - `ciRun` (when `--ci` is passed): latest GitHub Actions `Backend verification` run status.
 *
 * - `--stamp-sync` (`node scripts/agent-handoff.mjs --stamp-sync`):
 *   Updates `Resulting commit: uncommitted...` in the latest handoff section of
 *   `docs/coordination.md` prior to Git Agent commit.
 */

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const GO_BIN_PATH = `${process.env.LOCALAPPDATA || ''}\\Programs\\Go\\bin`;
const PATH_WITH_GO = `${GO_BIN_PATH};${process.env.PATH || ''}`;
const SIGNAL_PATH = resolve(ROOT, '.agent-signal.json');
const COORD_PATH = resolve(ROOT, 'docs/coordination.md');

function run(cmd, cwd = ROOT, envExtra = {}, input = undefined) {
  try {
    const out = execSync(cmd, {
      cwd,
      env: { ...process.env, PATH: PATH_WITH_GO, ...envExtra },
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      input,
    });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: err.stdout || '', err: err.stderr || err.message };
  }
}

function computeTreeHash() {
  const statusOut = run('git status --porcelain').out
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.endsWith('.agent-signal.json'))
    .join('\n');
  const diffOut = run('git diff HEAD').out;
  return createHash('sha256')
    .update(statusOut)
    .update('\n---DIFF---\n')
    .update(diffOut)
    .digest('hex');
}

function parseCoordination() {
  const coordContent = readFileSync(COORD_PATH, 'utf-8');
  const activeWriterMatch = coordContent.match(/^-\s+\*\*Active writer:\*\*\s*(.+)$/m);
  const activeWriter = activeWriterMatch ? activeWriterMatch[1].trim() : 'unknown';
  const writerReleased = /^none\b/i.test(activeWriter);

  // Find the first ## section after "## Current state"
  const afterCurrentState = coordContent.split(/^##\s+Current state\b/m)[1] || '';
  const nextSections = [...afterCurrentState.matchAll(/^##\s+(.+)$/gm)];
  const latestHeading = nextSections.length > 0 ? nextSections[0][1].trim() : 'unknown';

  // Extract body of that first section after Current state
  let latestSectionBody = '';
  if (nextSections.length > 0) {
    const startIdx = nextSections[0].index;
    const endIdx = nextSections.length > 1 ? nextSections[1].index : afterCurrentState.length;
    latestSectionBody = afterCurrentState.slice(startIdx, endIdx);
  }

  const statusLineMatch = latestSectionBody.match(/^Status:\s*(.+)$/m);
  const latestStatus = statusLineMatch ? statusLineMatch[1].trim() : '';
  const isPausedOrIncomplete =
    /\b(paused|incomplete)\b/i.test(latestHeading) ||
    /\b(paused|incomplete)\b/i.test(latestStatus);

  return {
    activeWriter,
    writerReleased,
    latestHeading,
    latestStatus,
    isPausedOrIncomplete,
  };
}

async function fetchLatestCiRun() {
  const credRes = run('git credential fill', ROOT, {}, 'protocol=https\nhost=github.com\n\n');
  if (!credRes.ok) return null;
  const passLine = credRes.out
    .split(/\r?\n/)
    .find((l) => l.startsWith('password='));
  if (!passLine) return null;
  const token = passLine.slice('password='.length).trim();
  try {
    const res = await fetch(
      'https://api.github.com/repos/Adeel0-0/sefgh-nextjs-main/actions/workflows/backend-verification.yml/runs?per_page=1',
      {
        headers: {
          'User-Agent': 'SEFGH-Git-Agent',
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    if (!res.ok) return { status: `http_${res.status}` };
    const data = await res.json();
    const latest = data.workflow_runs && data.workflow_runs[0];
    if (!latest) return null;
    return {
      id: latest.id,
      headSha: latest.head_sha ? latest.head_sha.slice(0, 7) : '',
      status: latest.status,
      conclusion: latest.conclusion,
      createdAt: latest.created_at,
    };
  } catch {
    return null;
  }
}

const args = new Set(process.argv.slice(2));

if (args.has('--stamp-sync')) {
  const headSha = run('git rev-parse --short HEAD').out.trim();
  const content = readFileSync(COORD_PATH, 'utf-8');
  const updated = content
    .replace(
      /^Resulting commit:\s*uncommitted.*$/m,
      `Resulting commit: synchronized by Git Agent on \`main\` and \`go-backend\` (from base \`${headSha}\`).`
    )
    .replace(
      /Git Agent receipt, commit and push are not verified\./g,
      `Synchronized and verified by Git Agent (base \`${headSha}\`).`
    );
  if (updated !== content) {
    writeFileSync(COORD_PATH, updated, 'utf-8');
    console.log(`[handoff] Stamped synchronization state in docs/coordination.md (base ${headSha}).`);
  }
  process.exit(0);
}

if (args.has('--status')) {
  const coord = parseCoordination();
  const porcelain = run('git status --porcelain').out
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.endsWith('.agent-signal.json'));
  const workingTreeClean = porcelain.length === 0;
  const treeHash = workingTreeClean ? null : computeTreeHash();

  let signal = null;
  if (existsSync(SIGNAL_PATH)) {
    try {
      signal = JSON.parse(readFileSync(SIGNAL_PATH, 'utf-8'));
    } catch {
      signal = null;
    }
  }

  const signalMatchesTree = Boolean(
    signal &&
      signal.contractsPassed &&
      signal.goBackendPassed &&
      signal.learnGoPassed &&
      signal.writerReleased &&
      !signal.isPausedOrIncomplete &&
      signal.treeHash &&
      signal.treeHash === treeHash
  );

  let state = 'IDLE_CLEAN';
  if (!workingTreeClean) {
    if (!coord.writerReleased) {
      state = 'WRITER_ACTIVE';
    } else if (coord.isPausedOrIncomplete) {
      state = 'PAUSED_CHECKPOINT';
    } else if (signalMatchesTree) {
      state = 'READY_VERIFIED';
    } else {
      state = 'READY_NEEDS_VERIFY';
    }
  }

  const ciRun = args.has('--ci') ? await fetchLatestCiRun() : undefined;

  console.log(
    JSON.stringify(
      {
        state,
        gitBranch: run('git rev-parse --abbrev-ref HEAD').out.trim(),
        gitHead: run('git rev-parse --short HEAD').out.trim(),
        workingTreeClean,
        changedFileCount: porcelain.length,
        activeWriter: coord.activeWriter,
        writerReleased: coord.writerReleased,
        latestHeading: coord.latestHeading,
        latestStatus: coord.latestStatus,
        isPausedOrIncomplete: coord.isPausedOrIncomplete,
        signalMatchesTree,
        ciRun,
      },
      null,
      2
    )
  );
  process.exit(0);
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
const learnGo = run('go test -count=1 -tags solution ./...', resolve(ROOT, 'learn-go'));
if (!learnGo.ok) {
  console.error('❌ learn-go solution tests failed:\n', learnGo.err || learnGo.out);
  process.exit(1);
}
console.log('✅ learn-go solutions passed.');

// 4. Inspect docs/coordination.md
console.log('\n4. Inspecting docs/coordination.md...');
const coord = parseCoordination();

if (coord.isPausedOrIncomplete) {
  console.error(
    `❌ Refusing handoff signal: latest section "${coord.latestHeading}" is marked paused/incomplete ("${coord.latestStatus}").`
  );
  process.exit(1);
}

if (!coord.writerReleased) {
  console.error(
    `❌ Refusing handoff signal: Active writer is "${coord.activeWriter}". Release writer to "none" in docs/coordination.md before running npm run handoff.`
  );
  process.exit(1);
}

console.log('✅ docs/coordination.md records: Active writer is "none" and task is complete.');

// 5. Compute working-tree hash and emit .agent-signal.json
const treeHash = computeTreeHash();
const signal = {
  timestamp: new Date().toISOString(),
  contractsPassed: true,
  goBackendPassed: true,
  learnGoPassed: true,
  writerReleased: coord.writerReleased,
  isPausedOrIncomplete: coord.isPausedOrIncomplete,
  latestHeading: coord.latestHeading,
  treeHash,
  gitHead: run('git rev-parse HEAD').out.trim(),
  gitBranch: run('git rev-parse --abbrev-ref HEAD').out.trim(),
};

writeFileSync(SIGNAL_PATH, JSON.stringify(signal, null, 2), 'utf-8');
console.log(`\n✅ Verification complete (treeHash: ${treeHash.slice(0, 12)}). Emitted .agent-signal.json`);
console.log('Ready for Git Agent commit, synchronization, and merge.');
