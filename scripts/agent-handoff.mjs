#!/usr/bin/env node
/**
 * scripts/agent-handoff.mjs
 *
 * Shared automation & verification pipeline for Claude Code, Codex, and the Git Agent.
 *
 * Modes:
 * - Default (`npm run handoff`):
 *   1. Runs contract tests and Go backend tests/vet/gofmt. Lessons are optional
 *      with `--lessons`; default skip follows the owner's tutorial policy.
 *   2. Verifies `docs/coordination.md` has `Active writer: none` and that the latest
 *      checkpoint/handoff is NOT marked `paused` or `incomplete`.
 *   3. Holds an exclusive advisory verification lease and compares working-tree
 *      fingerprints before/after checks. A differing source tree cannot get proof.
 *   4. Emits `.agent-signal.json`.
 *
 * - `--status` (`node scripts/agent-handoff.mjs --status [--ci]`):
 *   Fast read-only status probe for the Git Agent watcher. Prints JSON with:
 *   - `state`: "STATUS_ERROR" | "VERIFICATION_BUSY" | "IDLE_CLEAN" | "WRITER_ACTIVE" | "PAUSED_CHECKPOINT" | "READY_VERIFIED" | "READY_NEEDS_VERIFY"
 *   - `verification`, `canSynchronize`: any existing/unknown lease blocks synchronization.
 *   - `activeWriter`, `latestHeading`, `latestStatus`, `treeHash`, `signalMatchesTree`
 *   - `ciRun` (when `--ci` is passed): latest GitHub Actions `Backend verification` run status.
 *
 * - `--stamp-sync` (`node scripts/agent-handoff.mjs --stamp-sync`):
 *   Records synchronization as pending in `docs/coordination.md` before the
 *   Git Agent commit. A pre-commit stamp is not proof of synchronization.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
import { computeTreeHash, stampPendingSync } from './handoff-state.mjs';
import { acquireVerificationLease, releaseVerificationLease, verificationLeaseState } from './handoff-lease.mjs';

const ROOT = resolve(process.cwd());
const GO_BIN_PATH = `${process.env.LOCALAPPDATA || ''}\\Programs\\Go\\bin`;
const PATH_WITH_GO = process.platform === 'win32'
  ? `${GO_BIN_PATH}${delimiter}${process.env.PATH || ''}`
  : process.env.PATH || '';
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
        signal: AbortSignal.timeout(5000),
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
  let stampLease;
  try {
    stampLease = acquireVerificationLease(ROOT);
    const coord = parseCoordination();
    if (!coord.writerReleased || coord.isPausedOrIncomplete) throw new Error('Writer not released');
    const headSha = run('git rev-parse --short HEAD').out.trim();
    const content = readFileSync(COORD_PATH, 'utf-8');
    const updated = stampPendingSync(content, headSha);
    if (updated !== content) {
      writeFileSync(COORD_PATH, updated, 'utf-8');
      console.log(`[handoff] Recorded pending synchronization in docs/coordination.md (base ${headSha}); commit and push still need verification.`);
    }
  } catch { console.error('Verification lease or writer gate unavailable; synchronization stamp refused.'); process.exitCode = 1; }
  finally { if (stampLease && !releaseVerificationLease(ROOT, stampLease)) process.exitCode = 1; }
  process.exit(process.exitCode || 0);
}

if (args.has('--status')) {
  try {
    const initialVerification = verificationLeaseState(ROOT);
    const coord = parseCoordination();
    const gitStatus = run('git status --porcelain');
    if (!gitStatus.ok) throw new Error('Git status unavailable');
    const porcelain = gitStatus.out.split(/\r?\n/)
      .filter((l) => l.trim() && !l.endsWith('.agent-signal.json') && !l.endsWith('.agent-verification.lock'));
    const workingTreeClean = porcelain.length === 0;
    const treeHash = workingTreeClean || initialVerification.present ? null : computeTreeHash(ROOT);
    let signal = null;
    if (existsSync(SIGNAL_PATH)) {
      try { signal = JSON.parse(readFileSync(SIGNAL_PATH, 'utf-8')); } catch { signal = null; }
    }
    // Complete all slow/async reads before the final lease sample and output.
    const ciRun = args.has('--ci') ? await fetchLatestCiRun() : undefined;
    const branch = run('git rev-parse --abbrev-ref HEAD'), head = run('git rev-parse --short HEAD');
    if (!branch.ok || !head.ok) throw new Error('Git reference unavailable');
    const lastVerification = verificationLeaseState(ROOT);
    const verification = lastVerification.present ? lastVerification : initialVerification;
    const signalMatchesTree = Boolean(
      !verification.present && signal && signal.contractsPassed && signal.goBackendPassed &&
      (signal.learnGoPassed === true ||
        (signal.learnGoPassed === null && signal.learnGoSkipped === true && signal.learnGoCheck === 'skipped-owner-policy')) &&
      signal.writerReleased && !signal.isPausedOrIncomplete && signal.treeHash && signal.treeHash === treeHash
    );
    let state = 'IDLE_CLEAN';
    if (verification.present) state = 'VERIFICATION_BUSY';
    else if (!workingTreeClean) {
      if (!coord.writerReleased) state = 'WRITER_ACTIVE';
      else if (coord.isPausedOrIncomplete) state = 'PAUSED_CHECKPOINT';
      else state = signalMatchesTree ? 'READY_VERIFIED' : 'READY_NEEDS_VERIFY';
    }
    console.log(JSON.stringify({ state, verification,
      canSynchronize: !verification.present && coord.writerReleased && !coord.isPausedOrIncomplete && (workingTreeClean || signalMatchesTree),
      gitBranch: branch.out.trim(), gitHead: head.out.trim(), workingTreeClean, changedFileCount: porcelain.length,
      activeWriter: coord.activeWriter, writerReleased: coord.writerReleased, latestHeading: coord.latestHeading,
      latestStatus: coord.latestStatus, isPausedOrIncomplete: coord.isPausedOrIncomplete, signalMatchesTree,
      learnGoCheck: signal?.learnGoCheck || (signal?.learnGoPassed === true ? 'passed' : null), ciRun,
    }, null, 2));
  } catch {
    console.log(JSON.stringify({ state: 'STATUS_ERROR', canSynchronize: false, workingTreeClean: null,
      signalMatchesTree: false, verification: verificationLeaseState(ROOT) }));
    process.exitCode = 1;
  }
  process.exit(process.exitCode || 0);
}

function verifyHandoff() {
  console.log('=== SEFGH Multi-Agent Handoff & Verification ===\n');

  // A new verification attempt supersedes its old proof, including when it
  // fails or is interrupted. Read-only/status and stamp modes above retain it.
  rmSync(SIGNAL_PATH, { force: true });
  const initialTreeHash = computeTreeHash(ROOT);

  // 1. Run Contracts
  console.log('1. Checking contract fixtures (npm run test:contracts)...');
  const contracts = run('npm run test:contracts');
  if (!contracts.ok) {
    console.error('❌ Contract tests failed:\n', [contracts.out, contracts.err].filter(Boolean).join('\n'));
    return false;
  }
  console.log('✅ Contracts passed.');

  // 2. Run Go Backend checks
  console.log('\n2. Checking Go backend (go test, go vet, gofmt)...');
  const goTest = run('go test -count=1 ./...', resolve(ROOT, 'backend'));
  if (!goTest.ok) {
    console.error('❌ backend/ go test failed:\n', [goTest.out, goTest.err].filter(Boolean).join('\n'));
    return false;
  }
  const goVet = run('go vet ./...', resolve(ROOT, 'backend'));
  if (!goVet.ok) {
    console.error('❌ backend/ go vet failed:\n', [goVet.out, goVet.err].filter(Boolean).join('\n'));
    return false;
  }
  const goFmt = run('gofmt -l .', resolve(ROOT, 'backend'));
  if (!goFmt.ok || goFmt.out.trim().length > 0) {
    console.error('❌ backend/ gofmt unformatted files:\n', goFmt.out);
    return false;
  }
  console.log('✅ Go backend passed.');

  // 3. Tutorial checks are opt-in; a skipped lesson is never a test pass.
  const checkLessons = args.has('--lessons');
  if (checkLessons) {
    console.log('\n3. Checking learn-go solutions (explicit --lessons)...');
    const learnGo = run('go test -count=1 -tags solution ./...', resolve(ROOT, 'learn-go'));
    if (!learnGo.ok) {
      console.error('❌ learn-go solution tests failed:\n', [learnGo.out, learnGo.err].filter(Boolean).join('\n'));
      return false;
    }
    console.log('✅ learn-go solutions passed.');
  } else {
    console.log('\n3. Lesson checks skipped (owner policy; use --lessons to request them).');
  }

  // 4. Inspect docs/coordination.md
  console.log('\n4. Inspecting docs/coordination.md...');
  const coord = parseCoordination();

  if (coord.isPausedOrIncomplete) {
    console.error(
      `❌ Refusing handoff signal: latest section "${coord.latestHeading}" is marked paused/incomplete ("${coord.latestStatus}").`
    );
    return false;
  }

  if (!coord.writerReleased) {
    console.error(
      `❌ Refusing handoff signal: Active writer is "${coord.activeWriter}". Release writer to "none" in docs/coordination.md before running npm run handoff.`
    );
    return false;
  }

  console.log('✅ docs/coordination.md records: Active writer is "none" and task is complete.');

  // 5. Compute working-tree hash and emit .agent-signal.json
  const treeHash = computeTreeHash(ROOT);
  if (treeHash !== initialTreeHash) {
    console.error('Source changed during verification; no success signal was emitted.');
    return false;
  }
  const signal = {
    timestamp: new Date().toISOString(),
    contractsPassed: true,
    goBackendPassed: true,
    learnGoPassed: checkLessons ? true : null,
    learnGoSkipped: !checkLessons,
    learnGoCheck: checkLessons ? 'passed' : 'skipped-owner-policy',
    writerReleased: coord.writerReleased,
    isPausedOrIncomplete: coord.isPausedOrIncomplete,
    latestHeading: coord.latestHeading,
    treeHash,
    gitHead: run('git rev-parse HEAD').out.trim(),
    gitBranch: run('git rev-parse --abbrev-ref HEAD').out.trim(),
  };

  writeFileSync(SIGNAL_PATH, JSON.stringify(signal, null, 2), 'utf-8');
  console.log(`\n✅ Verification complete (treeHash: ${treeHash.slice(0, 12)}). Emitted .agent-signal.json`);
  return true;

}

let verificationLease;
try {
  verificationLease = acquireVerificationLease(ROOT);
  if (!verifyHandoff()) process.exitCode = 1;
} catch (error) {
  console.error(verificationLease ? 'Handoff verification failed; no success claim.' : error.message);
  process.exitCode = 1;
} finally {
  if (verificationLease && !releaseVerificationLease(ROOT, verificationLease)) {
    console.error('Verification lease changed; inspect it before synchronization.');
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log('Ready for Git Agent commit, synchronization, and merge.');
