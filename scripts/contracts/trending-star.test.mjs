// Phase 6 guard (BUG-006): the trending card's Star button opens the
// repository on GitHub, where the visitor can star it (bug register R-060).
// It used to be a button that did nothing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { githubRepoUrl } = await import('../../src/lib/utils/trending/githubLink.js');

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the link goes to the repository on GitHub and nowhere else', () => {
  assert.equal(githubRepoUrl({ url: 'https://github.com/vercel/next.js', author: 'x', name: 'y' }), 'https://github.com/vercel/next.js');
  assert.equal(githubRepoUrl({ author: 'vercel', name: 'next.js' }), 'https://github.com/vercel/next.js', 'built from owner and name');
  assert.equal(githubRepoUrl({ url: 'javascript:alert(1)', author: 'a', name: 'b' }), 'https://github.com/a/b', 'a stored address that is not GitHub is ignored');
  assert.equal(githubRepoUrl({ url: 'https://github.com.evil.example/a', author: 'a', name: 'b' }), 'https://github.com/a/b');
  assert.equal(githubRepoUrl({ author: 'a/../b', name: 'c?d' }), 'https://github.com/a%2F..%2Fb/c%3Fd', 'owner and name are encoded');
  assert.equal(githubRepoUrl({ author: 'unknown', name: 'b' }), null, 'no owner, no button');
  assert.equal(githubRepoUrl({ author: 'a' }), null);
  assert.equal(githubRepoUrl(undefined), null);
});

test('the card links Star to GitHub, and curated rows carry the address', () => {
  const card = read('src/components/trending/TrendingRepositoryCard.jsx');
  assert.match(card, /href=\{githubRepoUrl\(repo\)\}/);
  assert.match(card, /rel="noopener noreferrer"/);
  assert.doesNotMatch(card, /<Button variant="outline" size="sm">\s*<Star/, 'the old button that did nothing');
  assert.match(read('src/hooks/trending/useTrendingData.js'), /url: repo\.html_url,/);
});
