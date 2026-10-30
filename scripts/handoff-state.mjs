// Git evidence used by the handoff command. Importing this file does not
// run verification, change the checkout, or contact the network.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve } from 'node:path';

export function computeTreeHash(root) {
  const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const hash = createHash('sha256');
  // Length framing keeps filenames, contents, and adjacent records distinct.
  const add = (value) => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    hash.update(`${bytes.length}:`);
    hash.update(bytes);
  };
  add(git('rev-parse', 'HEAD'));
  add(git('diff', '--binary', 'HEAD', '--', '.', ':(exclude).agent-signal.json', ':(exclude).agent-verification.lock'));
  add(git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--', '.', ':(exclude).agent-signal.json', ':(exclude).agent-verification.lock'));
  const untracked = git('ls-files', '--others', '--exclude-standard', '-z')
    .toString('utf8').split('\0').filter((name) => name && name !== '.agent-signal.json' && name !== '.agent-verification.lock').sort();
  for (const name of untracked) {
    add(name);
    const path = resolve(root, name);
    // Hash the link itself, without reading any file outside the checkout.
    const stat = lstatSync(path);
    add(stat.isSymbolicLink() ? 'symlink' : 'file');
    add(stat.isSymbolicLink() ? readlinkSync(path) : readFileSync(path));
  }
  return hash.digest('hex');
}

// --stamp-sync runs BEFORE the commit. It can record intent, never a receipt.
export function stampPendingSync(content, headSha) {
  // Only stamp the latest checkpoint/handoff, never an older uncommitted
  // record when the newest one already has a verified commit receipt.
  const current = /^## Current state\b/m.exec(content);
  const headings = current
    ? [...content.slice(current.index + current[0].length).matchAll(/^## .+$/gm)]
    : [];
  const offset = current ? current.index + current[0].length : 0;
  const start = headings.length ? offset + headings[0].index : 0;
  const end = headings.length > 1 ? offset + headings[1].index : content.length;
  const section = content.slice(start, end)
    .replace(
      /(?:^|(?<=\.\s*))Resulting commit:\s*(?:uncommitted|not yet made)[^\r\n]*/m,
      `Resulting commit: uncommitted; Git Agent commit and synchronization pending (base \`${headSha}\`).`
    )
    .replace(
      /Git Agent receipt, commit and push are not verified\./g,
      `Git Agent receipt, commit and push are not verified (base \`${headSha}\`); synchronization pending.`
    );
  return content.slice(0, start) + section + content.slice(end);
}
