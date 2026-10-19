// Phase 6 guard (TREND-001b): the trending page's topic sections come from
// GET /api/trending/topics, and nothing claims the data is old (bug register
// R-100). Before, the page read the empty trending_repos table, and its
// freshness check called no data "older than 3 days".
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fetchTrendingTopics, mergeTrending } from '../../src/lib/trending-topics.js';

const repo = (id, extra = {}) => ({ id, name: `r${id}`, trending: true, ...extra });
const answer = {
  generatedAt: '2026-10-19T09:30:00.000Z',
  topics: [
    { id: 'ai-ml', name: 'AI & Machine Learning', icon: 'a', complete: true, repos: [repo(1, { topic: 'AI' }), repo(2, { topic: 'AI' })] },
    { id: 'web-dev', name: 'Web Development', icon: 'w', complete: false, repos: [] },
    { id: 'data-science', name: 'Data Science', icon: 'd', complete: true, repos: [repo(2, { topic: 'Data' }), repo(3, { topic: 'Data' })] },
  ],
};

test('topic repositories are flattened in order, each once, with the search time', async () => {
  const asked = [];
  const result = await fetchTrendingTopics(async (path) => { asked.push(path); return Response.json(answer); });
  assert.deepEqual(asked, ['/api/trending/topics']);
  assert.deepEqual(result.repos.map((r) => [r.id, r.topic]), [[1, 'AI'], [2, 'AI'], [3, 'Data']]);
  assert.equal(result.generatedAt.toISOString(), '2026-10-19T09:30:00.000Z');
});

test('any failure means no topic sections and no date, never an error', async () => {
  const failures = [
    async () => new Response('Not Found', { status: 404 }), // the switch is off
    async () => Response.json({ error: 'Trending topics could not be loaded' }, { status: 502 }),
    async () => { throw new TypeError('fetch failed'); },
    async () => new Response('<html>', { status: 200 }),
    async () => Response.json({ topics: 'nope', generatedAt: 'later' }),
  ];
  for (const fetchImpl of failures) {
    assert.deepEqual(await fetchTrendingTopics(fetchImpl), { repos: [], generatedAt: null });
  }
});

test('a repository in a topic and in the main list is shown once, with its topic', () => {
  const merged = mergeTrending([repo(1, { topic: 'AI' }), repo(2, { topic: 'AI' })], [repo(2), repo(4), repo(4), { name: 'no id' }]);
  assert.deepEqual(merged.map((r) => [r.id, r.topic]), [[1, 'AI'], [2, 'AI'], [4, undefined], [undefined, undefined]]);
});

test('no page reads trending_repos or says the data is older than three days (R-100)', async () => {
  const files = ['src/hooks/trending/useTrendingData.js', 'src/app/trending/page.js', 'src/components/trending/TrendingFilters.jsx'];
  for (const file of files) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
    assert.ok(!/isTrendingDataStale|getAllTrendingRepos|getLastRefreshTime|isDataStale/.test(source), file);
    assert.ok(!source.includes('older than 3 days'), file);
  }
});
