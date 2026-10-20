import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

test('every Go lesson is linked once inside the same Markdown index table', async () => {
  const root = new URL('../../learn-go/', import.meta.url);
  const readme = await readFile(new URL('README.md', root), 'utf8');
  const section = readme.split('## The lessons')[1].split('Two lessons end')[0];
  const lines = section.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith('| Lesson |'));
  assert.ok(start >= 0, 'lesson table header missing');
  let end = start;
  while (end < lines.length && lines[end].startsWith('|')) end++;
  assert.equal(lines.slice(end).some((line) => line.startsWith('|')), false, 'a blank line split the lesson table');
  const table = lines.slice(start, end).join('\n');
  const links = [...table.matchAll(/\]\((\d{2}-[^/]+)\/README\.md\)/g)].map((match) => match[1]);
  const directories = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name)).map((entry) => entry.name);
  assert.deepEqual(links.toSorted(), directories.toSorted());
});
