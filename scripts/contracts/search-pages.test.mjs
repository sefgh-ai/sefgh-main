// Phase 6 guard (BUG-006): search pages stop where GitHub stops serving
// results, so no page button or "load more" asks for a page GitHub refuses
// (bug register R-018).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { lastSearchPage } = await import('../../src/lib/github/search-pages.js');

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the last page is the last one GitHub serves', () => {
  // Checked against GitHub on 2026-10-14: page 34 of 30 answered, page 35 was refused.
  assert.equal(lastSearchPage(1_234_567, 30), 34);
  assert.equal(lastSearchPage(1000, 30), 34);
  assert.equal(lastSearchPage(990, 30), 33);
  assert.equal(lastSearchPage(31, 30), 2);
  assert.equal(lastSearchPage(1_234_567, 100), 10);
  assert.equal(lastSearchPage(0, 30), 0);
  assert.equal(lastSearchPage(undefined, 30), 0);
});

test('both the page buttons and "load more" use it', () => {
  const results = read('src/components/search/SearchResults.jsx');
  assert.match(results, /const totalPages = lastSearchPage\(totalCount, itemsPerPage\);/);
  assert.doesNotMatch(results, /Math\.ceil\(totalCount \/ itemsPerPage\)/);
  assert.match(read('src/hooks/search/useGitHubSearch.js'), /const hasMore = currentPage < lastSearchPage\(totalCount, 30\);/);
});
