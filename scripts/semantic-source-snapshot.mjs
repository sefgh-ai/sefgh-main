// Read-only source-drift check. Never imports Python or loads environment files.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function checkSnapshot(root, manifest) {
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('expected a version-1 source snapshot');
  }
  const base = resolve(root);
  const seen = new Set();
  const results = [];
  for (const file of manifest.files) {
    // The allowlist contains source paths only, never .env, transcripts or data.
    if (typeof file.path !== 'string' || /[\\:\u0000]/.test(file.path) ||
        file.path.split('/').some((part) => !part || part === '.' || part === '..' || part.startsWith('.')) ||
        !/\.(py|sql|toml|txt)$/.test(file.path) ||
        !/^[a-f0-9]{64}$/.test(file.sha256) || seen.has(file.path)) {
      throw new Error('invalid or duplicate snapshot entry');
    }
    seen.add(file.path);
    const path = resolve(base, file.path);
    const rel = relative(base, path);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('source path escapes root');
    try {
      const bytes = await readFile(path);
      results.push({ path: file.path, status: createHash('sha256').update(bytes).digest('hex') === file.sha256 ? 'match' : 'changed' });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      results.push({ path: file.path, status: 'missing' });
    }
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--root') throw new Error('usage: node scripts/semantic-source-snapshot.mjs --root D:/SEFGH');
    const manifest = JSON.parse(await readFile(new URL('../contracts/semantic-search/source-snapshot.json', import.meta.url), 'utf8'));
    const files = await checkSnapshot(process.argv[3], manifest);
    const match = files.every((file) => file.status === 'match');
    process.stdout.write(`${JSON.stringify({ match, files }, null, 2)}\n`);
    process.exitCode = match ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
