// Advisory coordination for cooperating verification/Git-agent commands.
// An existing, stale or unreadable lease always blocks; never auto-reset it.
import { randomUUID } from 'node:crypto';
import { closeSync, fstatSync, lstatSync, openSync, readSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const VERIFICATION_LEASE = '.agent-verification.lock';
function inspect(root) {
  const path = join(root, VERIFICATION_LEASE); let fd;
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024) return { present: true, state: 'unreadable' };
    fd = openSync(path, 'r');
    if (fstatSync(fd).size > 1024) return { present: true, state: 'unreadable' };
    const bytes = Buffer.alloc(1025), size = readSync(fd, bytes, 0, bytes.length, 0);
    if (size > 1024) return { present: true, state: 'unreadable' };
    const record = JSON.parse(bytes.subarray(0, size).toString('utf8'));
    if (record.version !== 1 || !Number.isSafeInteger(record.pid) || record.pid < 1 ||
      typeof record.nonce !== 'string' || !/^[a-f0-9-]{36}$/.test(record.nonce) ||
      typeof record.startedAt !== 'string' || !Number.isFinite(Date.parse(record.startedAt)))
      return { present: true, state: 'unreadable' };
    return { present: true, state: 'held-or-interrupted', record };
  } catch (error) {
    return error.code === 'ENOENT' ? { present: false, state: 'absent' } : { present: true, state: 'unreadable' };
  } finally { if (fd !== undefined) closeSync(fd); }
}

export function verificationLeaseState(root) {
  const value = inspect(root);
  return { present: value.present, state: value.state,
    ...(value.record ? { pid: value.record.pid, startedAt: value.record.startedAt } : {}) };
}

export function acquireVerificationLease(root) {
  let fd;
  const record = { version: 1, nonce: randomUUID(), pid: process.pid, startedAt: new Date().toISOString() };
  try {
    fd = openSync(join(root, VERIFICATION_LEASE), 'wx', 0o600);
    writeFileSync(fd, JSON.stringify(record));
    return record;
  } catch {
    throw new Error('Verification lease unavailable; do not synchronize or reset an existing lease automatically.');
  } finally { if (fd !== undefined) closeSync(fd); }
}

export function releaseVerificationLease(root, lease) {
  const value = inspect(root);
  if (!value.record || value.record.pid !== process.pid || value.record.nonce !== lease.nonce) return false;
  rmSync(join(root, VERIFICATION_LEASE)); return true;
}
