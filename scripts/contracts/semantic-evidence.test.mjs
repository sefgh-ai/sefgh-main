import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkSnapshot } from '../semantic-source-snapshot.mjs';

const folder = new URL('../../contracts/semantic-search/', import.meta.url);
const sha = (data) => createHash('sha256').update(data).digest('hex');

test('synthetic captures identify the actual frozen example artifacts', async () => {
  const [baseline, candidate] = await Promise.all(['baseline', 'candidate'].map(async (name) => JSON.parse(await readFile(new URL(`example-${name}.json`, folder), 'utf8'))));
  assert.deepEqual(baseline.identity, candidate.identity);
  assert.equal(baseline.identity.pipeline, 'synthetic-only');
  for (const [name, field] of [['corpus', 'corpus_sha256'], ['preparation', 'preparation_sha256']]) {
    assert.equal(baseline.identity[field], sha(await readFile(new URL(`example-${name}.json`, folder))));
  }
  assert.equal(baseline.queries[0].request_sha256, sha(await readFile(new URL('example-request.json', folder))));
  assert.equal(candidate.queries[0].request_sha256, baseline.queries[0].request_sha256);
  assert.equal(candidate.queries[0].relevant_ids, undefined);
});

test('source checker detects drift and missing files without executing source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sefgh-semantic-snapshot-'));
  try {
    await mkdir(join(root, 'candidate'));
    const source = 'raise RuntimeError("MUST NOT EXECUTE")\n';
    await writeFile(join(root, 'candidate', 'main.py'), source);
    const manifest = { version: 1, files: [{ path: 'candidate/main.py', sha256: sha(source) }, { path: 'candidate/missing.sql', sha256: sha('missing') }] };
    assert.deepEqual((await checkSnapshot(root, manifest)).map((item) => item.status), ['match', 'missing']);
    await writeFile(join(root, 'candidate', 'main.py'), 'changed');
    assert.equal((await checkSnapshot(root, manifest))[0].status, 'changed');
    for (const path of ['../secret.py', '.env', 'candidate/../main.py', 'candidate/.env.py', '/absolute.py', 'C:/absolute.py', 'candidate\\main.py', 'candidate/transcript.md']) {
      await assert.rejects(checkSnapshot(root, { version: 1, files: [{ path, sha256: sha(source) }] }));
    }
    await assert.rejects(checkSnapshot(root, { version: 1, files: [manifest.files[0], manifest.files[0]] }));
  } finally { await rm(root, { recursive: true, force: true }); }
});
