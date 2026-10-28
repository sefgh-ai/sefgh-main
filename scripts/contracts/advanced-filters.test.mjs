// Phase 6 guard (BUG-034): the search sends the navbar's supported filters
// (bug register R-017), and every value it sends is one the Go search
// accepts. Go's own patterns are read from backend/internal/githubsearch/
// request.go, so the two cannot drift apart.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { appendAdvancedFilters } = await import('../../src/lib/search/advanced-filters.js');

const goSource = await readFile(new URL('../../backend/internal/githubsearch/request.go', import.meta.url), 'utf8');
const goPattern = (name) => new RegExp(goSource.match(new RegExp(`${name}\\s*=\\s*regexp\\.MustCompile\\(\`([^\`]*)\`\\)`))[1]);
const accepts = {
  license: goPattern('licensePattern'),
  created: goPattern('createdPattern'),
  topic: goPattern('topicPattern'),
  forks: goPattern('starsPattern'),
};
const NOW = new Date('2026-10-28T12:00:00Z');
const sent = (filters) => Object.fromEntries(appendAdvancedFilters(new URLSearchParams(), filters, NOW));

test('the supported filters are sent, the rest are not', () => {
  assert.deepEqual(sent({ license: 'mit', dateRange: 'week', topics: ['web', 'cli'], forks: '>=10', hasWiki: true, hasIssues: true }), {
    license: 'mit',
    created: '>=2026-10-21',
    topic: 'web,cli',
    forks: '>=10',
  });
  assert.deepEqual(sent({ license: '', dateRange: '', hasWiki: false, hasIssues: false, topics: [], forks: '' }), {});
  assert.deepEqual(sent(), {});
});

test('each date range counts back from now, with >= so the edge day is kept', () => {
  assert.equal(sent({ dateRange: 'day' }).created, '>=2026-10-27');
  assert.equal(sent({ dateRange: 'week' }).created, '>=2026-10-21');
  assert.equal(sent({ dateRange: 'month' }).created, '>=2026-09-28');
  assert.equal(sent({ dateRange: 'year' }).created, '>=2025-10-28');
  assert.equal(sent({ dateRange: 'decade' }).created, undefined);
});

test('every value sent matches the Go search\'s own pattern', async () => {
  const navbar = await readFile(new URL('../../src/components/search/SearchNavbar.jsx', import.meta.url), 'utf8');
  const licenses = [...navbar.matchAll(/value: "([a-z0-9.-]+)"/g)].map((m) => m[1]).filter((v) => !['day', 'week', 'month', 'year'].includes(v));
  assert.ok(licenses.length >= 4, 'the navbar lists its licenses');
  for (const license of licenses) assert.match(sent({ license }).license, accepts.license, license);
  for (const dateRange of ['day', 'week', 'month', 'year']) assert.match(sent({ dateRange }).created, accepts.created, dateRange);
  for (const topic of sent({ topics: ['web', 'cli'] }).topic.split(',')) assert.match(topic, accepts.topic);
  assert.match(sent({ forks: '>=10' }).forks, accepts.forks);
});

test('all three search requests send the filters', async () => {
  const hook = await readFile(new URL('../../src/hooks/search/useGitHubSearch.js', import.meta.url), 'utf8');
  assert.match(hook, /import \{ appendAdvancedFilters \} from "@\/lib\/search\/advanced-filters";/);
  assert.equal(hook.match(/appendAdvancedFilters\(params, advancedFilters\);/g)?.length, 3);
  assert.equal(hook.match(/fetch\(`\/api\/github\/search\?\$\{params\}`\)/g)?.length, 3);
});
