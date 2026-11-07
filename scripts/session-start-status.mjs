#!/usr/bin/env node
/**
 * scripts/session-start-status.mjs
 *
 * Claude Code SessionStart hook (wired in .claude/settings.json). Read-only.
 * Runs `node scripts/agent-handoff.mjs --status` for the checkout the session
 * opened in and tells the session, before its first step, who holds the
 * writer flag and the verification lease, and the rules that keep agents and
 * the Git Agent from blocking each other (AGENTS.md, "Writer flag and
 * verification lease"). It never takes, changes or removes a flag or lease.
 * Any failure prints a warning and exits 0, so a session always starts.
 */

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

const RULES = [
  'SEFGH writer flag and verification lease (AGENTS.md):',
  '1. Before editing, run `node scripts/agent-handoff.mjs --status`. Proceed only on IDLE_CLEAN, READY_VERIFIED or READY_NEEDS_VERIFY with writerReleased true.',
  '2. Take the flag first: set "Active writer:" in docs/coordination.md to you, the task ID, branch, base commit and files. Status then reads WRITER_ACTIVE and the Git Agent leaves the checkout alone.',
  '3. Release it when you stop: write the handoff record, set "Active writer: none", then run `npm run handoff` (it takes and drops the verification lease itself). Paused work gets a paused/incomplete checkpoint and no handoff run.',
  '4. On VERIFICATION_BUSY or STATUS_ERROR, do not edit, commit, sync or start checks; wait for the lease owner (see docs/verification/handoff-concurrency.md). Never reset, delete or steal a lease or another writer\'s flag.',
  '5. Never hold the flag while waiting on the owner, CI or another agent. Release it, or write a paused checkpoint first.',
].join('\n');

let summary;
try {
  const out = execFileSync(process.execPath, ['scripts/agent-handoff.mjs', '--status'], {
    cwd: root,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 25000,
  });
  const s = JSON.parse(out);
  const lease = s.verification?.state ?? 'unknown';
  const writer = s.writerReleased ? 'released' : `held: ${String(s.activeWriter).slice(0, 200)}`;
  summary = [
    `Handoff status for ${s.gitBranch ?? '?'} @ ${s.gitHead ?? '?'}: ${s.state}.`,
    `Verification lease: ${lease}. Writer flag: ${writer}.`,
    `Working tree clean: ${s.workingTreeClean}; latest handoff: ${s.latestHeading ?? 'none'}.`,
  ].join(' ');
} catch (err) {
  // --status exits nonzero for STATUS_ERROR; its JSON may still be on stdout.
  let state = 'STATUS_ERROR';
  try { state = JSON.parse(err.stdout || '{}').state || state; } catch { /* keep default */ }
  summary = `Handoff status could not be read cleanly (${state}). Treat the checkout as busy: do not edit, commit or sync until \`node scripts/agent-handoff.mjs --status\` succeeds.`;
}

process.stdout.write(JSON.stringify({
  systemMessage: summary,
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: `${summary}\n\n${RULES}`,
  },
}));
