// Phase 6 guards (BUG-073) for redesign findings from REDESIGN-CHECK-001.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { readmeUrlTransform, resolveReadmeUrl } = await import('../../src/lib/github/readme-links.js');
const { firstProjectPage } = await import('../../src/lib/home/projectPage.js');
const { mountSearchAction } = await import('../../src/lib/search/restore.js');

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('R-228: README relative links open the repository file on GitHub', () => {
  const t = readmeUrlTransform('typescript-cheatsheets/react');
  assert.equal(t('/CONTRIBUTORS.md', 'href'), 'https://github.com/typescript-cheatsheets/react/blob/HEAD/CONTRIBUTORS.md');
  assert.equal(t('docs/basic/setup.md', 'href'), 'https://github.com/typescript-cheatsheets/react/blob/HEAD/docs/basic/setup.md');
  assert.equal(t('./logo.png', 'src'), 'https://raw.githubusercontent.com/typescript-cheatsheets/react/HEAD/logo.png');
  // Absolute URLs and in-page anchors are left alone; unsafe schemes are dropped.
  assert.equal(t('https://example.com/a', 'href'), 'https://example.com/a');
  assert.equal(t('#setup', 'href'), '#setup');
  assert.equal(t('mailto:a@example.com', 'href'), 'mailto:a@example.com');
  assert.equal(t('javascript:alert(1)', 'href'), '');
  assert.equal(readmeUrlTransform('not a repo'), undefined);
  assert.equal(resolveReadmeUrl('', 'https://github.com/a/b/blob/HEAD/'), '');
});

test('R-228: react-markdown renders the rewritten URLs', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: Markdown } = await import('react-markdown');
  const html = renderToStaticMarkup(createElement(Markdown, {
    urlTransform: readmeUrlTransform('typescript-cheatsheets/react'),
    children: '[Contributors](/CONTRIBUTORS.md) ![logo](logo.png) [x](javascript:alert(1))',
  }));
  assert.match(html, /href="https:\/\/github\.com\/typescript-cheatsheets\/react\/blob\/HEAD\/CONTRIBUTORS\.md"/);
  assert.match(html, /src="https:\/\/raw\.githubusercontent\.com\/typescript-cheatsheets\/react\/HEAD\/logo\.png"/);
  assert.doesNotMatch(html, /javascript:/);
});

test('R-228: both README views pass the rewrite', () => {
  assert.match(read('src/components/repo-page/RepoView.jsx'), /urlTransform=\{readmeUrlTransform\(full\)\}/);
  assert.match(read('src/components/CodeExplorer.jsx'), /urlTransform=\{readmeUrlTransform\(repository\.full_name\)\}/);
  assert.match(read('src/components/MarkdownRenderer.jsx'), /urlTransform=\{urlTransform\}/);
});

test('R-231: an empty first page replaces the previous tab rows', () => {
  assert.deepEqual(firstProjectPage([], 10), { projects: [], offset: 0, hasMore: false });
  assert.deepEqual(firstProjectPage(null, 10), { projects: [], offset: 0, hasMore: false });
  const ten = Array.from({ length: 10 }, (_, id) => ({ id }));
  assert.deepEqual(firstProjectPage(ten, 10), { projects: ten, offset: 10, hasMore: true });
  assert.equal(firstProjectPage(ten.slice(0, 3), 10).hasMore, false);
  assert.match(read('src/hooks/home/useProjects.js'), /const page = firstProjectPage\(data, PAGE_SIZE\);\s*setAllProjects\(page\.projects\);/);
});

test('R-230: Search either restores the cache or runs the URL query, never both', () => {
  const cached = { query: 'react', results: [{ id: 1 }], language: 'TypeScript' };
  assert.equal(mountSearchAction(cached, 'react'), 'restore');
  assert.equal(mountSearchAction(cached, ''), 'restore');
  assert.equal(mountSearchAction(cached, 'vue'), 'search');
  assert.equal(mountSearchAction({ query: 'react', results: [] }, 'react'), 'search');
  assert.equal(mountSearchAction(null, 'react'), 'search');
  assert.equal(mountSearchAction(null, ''), 'none');
  const hook = read('src/hooks/search/useGitHubSearch.js');
  assert.doesNotMatch(hook, /hasAutoSearched/);
  assert.equal(hook.match(/handleSearch\(\);/g)?.length, 1);
});

test('R-232: the Landing footer Status pill opens the local status page', () => {
  const footer = read('src/components/landing/LandingFooter.jsx');
  assert.match(footer, /<Pill href="\/status" className="[^"]*">\s*Status\s*<\/Pill>/);
  assert.doesNotMatch(footer, /sefgh\.org/);
});

test('R-227: a page change shows that it is loading', () => {
  assert.match(read('src/components/search-page/SearchView.jsx'), /pagePending=\{s\.loadingMore\}/);
  const views = read('src/components/search-page/SearchResultsViews.jsx');
  assert.match(views, /aria-busy=\{pending\}/);
  assert.match(views, /pending=\{pagePending\}/);
});
