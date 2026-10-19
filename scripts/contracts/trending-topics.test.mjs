// GET /api/trending/topics, contract version 1 (TREND-001a). The endpoint
// exists only in Go (backend/internal/trendingtopics), which runs these cases
// in its contract test; there is no Next.js handler to run them against.
// This file checks the fixtures themselves.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const contract = JSON.parse(await readFile(new URL('../../contracts/trending-topics/cases.json', import.meta.url), 'utf8'));
const TOPICS = ['ai-ml', 'web-dev', 'mobile', 'devops', 'data-science', 'security'];
const COMPLETE = 'public, max-age=0, s-maxage=21600, stale-while-revalidate=3600';
const PARTIAL = 'public, max-age=0, s-maxage=300';

test('trending topics fixture integrity', () => {
  assert.equal(contract.contract_version, 1);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(c.reason, c.id);
    assert.deepEqual(Object.keys(c.github).sort(), [...TOPICS].sort(), c.id);
    // One search per topic, always, for public repositories only.
    assert.equal(c.expect.requests.length, TOPICS.length, c.id);
    for (const path of c.expect.requests) {
      assert.ok(path.startsWith('/search/repositories?q='), c.id);
      // GitHub refuses OR between topic: qualifiers (R-101).
      assert.ok(!path.includes('topic%3A'), c.id);
      assert.ok(path.includes('%20created%3A%3E2026-09-19%20stars%3A%3E100&sort=stars&order=desc&per_page=5'), c.id);
    }
    if (c.expect.status === 502) {
      assert.equal(c.expect.cache_control, 'no-store', c.id);
      assert.deepEqual(c.expect.body, { error: 'Trending topics could not be loaded' }, c.id);
      continue;
    }
    assert.equal(c.expect.status, 200, c.id);
    const topics = c.expect.body.topics;
    assert.deepEqual(topics.map((t) => t.id), TOPICS, c.id);
    const complete = topics.filter((t) => t.complete).length;
    assert.ok(complete > 0, c.id);
    assert.equal(c.expect.cache_control, complete === TOPICS.length ? COMPLETE : PARTIAL, c.id);
    for (const topic of topics) {
      assert.ok(topic.repos.length <= 5, c.id);
      if (!topic.complete) assert.deepEqual(topic.repos, [], c.id);
      for (const repo of topic.repos) {
        assert.equal(repo.topic, topic.name, c.id);
        assert.equal(repo.topicIcon, topic.icon, c.id);
        assert.equal(repo.trending, true, c.id);
      }
    }
  }
});
