#!/usr/bin/env node
/**
 * scripts/session-start-status.mjs
 *
 * Claude Code SessionStart hook (wired in .claude/settings.json). Read-only.
 * Runs `agent-handoff.mjs --status` for the checkout the session works in and
 * tells the session, before its first step, who holds the writer flag and the
 * verification lease. The rules themselves are in AGENTS.md ("Writer flag and
 * verification lease"), which every session already loads; this hook only
 * reports state and names the checkout it read, so a session can see when
 * that is not its own. It never takes, changes or removes a flag or lease.
 * Any failure prints a warning and exits 0, so a session always starts.
 *
 * Which checkout (R-233): a desktop-app session in `.claude/worktrees/<name>`
 * starts with CLAUDE_PROJECT_DIR pointing at the main checkout. The session's
 * own directory arrives as `cwd` in the hook's JSON on stdin, so that is tried
 * first, then the process directory, then CLAUDE_PROJECT_DIR.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const statusScript = join(dirname(fileURLToPath(import.meta.url)), 'agent-handoff.mjs');

function hookInput() {
  if (process.stdin.isTTY) return {};
  try { return JSON.parse(readFileSync(0, 'utf-8') || '{}'); } catch { return {}; }
}

// The checkout root above a directory, or null when it is not in a SEFGH checkout.
function checkoutRoot(dir) {
  if (!dir) return null;
  try {
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000, windowsHide: true,
    }).trim();
    return top && existsSync(join(top, 'docs', 'coordination.md')) ? resolve(top) : null;
  } catch { return null; }
}

const root = [hookInput().cwd, process.cwd(), process.env.CLAUDE_PROJECT_DIR]
  .map(checkoutRoot).find(Boolean) || resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

const POINTER = 'This is the state of that checkout only; if you edit another one, run `node scripts/agent-handoff.mjs --status` there. Edit only on IDLE_CLEAN, READY_VERIFIED or READY_NEEDS_VERIFY with the writer flag released, and take the flag first (AGENTS.md, "Writer flag and verification lease").';

let summary;
try {
  const out = execFileSync(process.execPath, [statusScript, '--status'], {
    cwd: root,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 25000,
  });
  const s = JSON.parse(out);
  const lease = s.verification?.state ?? 'unknown';
  const writer = s.writerReleased ? 'released' : `held: ${String(s.activeWriter).slice(0, 200)}`;
  summary = [
    `Handoff status for ${root} (${s.gitBranch ?? '?'} @ ${s.gitHead ?? '?'}): ${s.state}.`,
    `Verification lease: ${lease}. Writer flag: ${writer}.`,
    `Working tree clean: ${s.workingTreeClean}; latest handoff: ${s.latestHeading ?? 'none'}.`,
  ].join(' ');
} catch (err) {
  // --status exits nonzero for STATUS_ERROR; its JSON may still be on stdout.
  let state = 'STATUS_ERROR';
  try { state = JSON.parse(err.stdout || '{}').state || state; } catch { /* keep default */ }
  summary = `Handoff status for ${root} could not be read cleanly (${state}). Treat the checkout as busy: do not edit, commit or sync until \`node scripts/agent-handoff.mjs --status\` succeeds.`;
}

process.stdout.write(JSON.stringify({
  systemMessage: summary,
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: `${summary}\n${POINTER}`,
  },
}));
