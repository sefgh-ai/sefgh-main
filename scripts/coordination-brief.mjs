#!/usr/bin/env node
/**
 * scripts/coordination-brief.mjs  (`npm run brief`)
 *
 * Prints the part of docs/coordination.md an agent needs at the start of a
 * task: everything up to and including "Current state", then the newest
 * handoff/checkpoint records. The whole file is far larger than an agent can
 * load (R-234), and the rest of it is history: search it by task ID instead.
 * Read-only. It changes nothing and takes no flag or lease.
 *
 *   node scripts/coordination-brief.mjs            newest 2 records
 *   node scripts/coordination-brief.mjs 5          newest 5 records
 *   node scripts/coordination-brief.mjs BUG-071    every record whose heading names BUG-071
 *   node scripts/coordination-brief.mjs --list     headings only, newest first
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Split the file into its preamble (through "Current state") and its records.
export function splitCoordination(content) {
  const current = /^## Current state\b.*$/m.exec(content);
  if (!current) return { preamble: content, records: [] };
  const afterCurrent = current.index + current[0].length;
  const starts = [...content.slice(afterCurrent).matchAll(/^## .+$/gm)].map((m) => afterCurrent + m.index);
  if (!starts.length) return { preamble: content, records: [] };
  const records = starts.map((start, i) => {
    const text = content.slice(start, starts[i + 1] ?? content.length).trimEnd();
    return { heading: text.slice(3, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n')).trim(), text };
  });
  return { preamble: content.slice(0, starts[0]).trimEnd(), records };
}

export function brief(content, arg) {
  const { preamble, records } = splitCoordination(content);
  if (arg === '--list') return records.map((r) => r.heading).join('\n');
  const byCount = arg === undefined || /^\d+$/.test(arg);
  const picked = byCount
    ? records.slice(0, Number(arg ?? 2))
    : records.filter((r) => r.heading.toLowerCase().includes(arg.toLowerCase()));
  const note = `[brief: ${picked.length} of ${records.length} records; \`--list\` shows every heading, \`<task ID>\` a record by name]`;
  return [byCount ? preamble : null, ...picked.map((r) => r.text), note].filter(Boolean).join('\n\n');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename ?? '')) {
  const content = readFileSync(resolve(process.cwd(), 'docs/coordination.md'), 'utf-8');
  process.stdout.write(`${brief(content, process.argv[2])}\n`);
}
