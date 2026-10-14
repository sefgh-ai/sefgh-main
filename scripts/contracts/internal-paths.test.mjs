// Phase 6 guard (BUG-003): every internal link, navigation target and API
// call written in src/ must lead somewhere: a page, a route handler or a
// file in public/. A link to "#" leads nowhere. This is what caught the
// navbar's /downloads link (bug register R-001) and the newsletter's
// privacy link (R-003).
//
// It reads the source; it does not run the app. Only literal paths, and the
// literal start of a template string, can be checked.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const src = join(root, 'src');

// Paths known to lead nowhere, each an open entry in docs/bug-register.md.
// When one is fixed, remove it here; the test fails until you do.
const KNOWN = new Map([
  ['api /api/log-error', 'R-004'],
  ['page /blog/rss.xml', 'R-051'],
]);

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

// Every page.js and route.js under src/app, as a pattern. A route group
// "(name)" is not part of the URL; [x] is one segment and [...x] several.
function routes(files) {
  const pages = [];
  const apis = [];
  for (const file of files) {
    const rel = relative(join(src, 'app'), file).split('\\').join('/');
    const match = !rel.startsWith('..') && rel.match(/^(.*?)\/?(page|route)\.(js|jsx|ts|tsx)$/);
    if (!match) continue;
    const segments = match[1].split('/').filter((s) => s && !/^\(.*\)$/.test(s));
    const pattern = segments.map((s) => (s.startsWith('[...') ? '.+' : s.startsWith('[') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    (match[2] === 'page' ? pages : apis).push({ path: `/${segments.join('/')}`, re: new RegExp(`^/${pattern.join('/')}/?$`) });
  }
  return { pages, apis };
}

const PATTERNS = [
  { kind: 'link', re: /\bhref=\{?\s*["'`](\/[^"'`?#{}$\s]*)/g },
  // Links kept in a list, such as a footer's { href: "/download", label } or
  // the links page's { name, url: "/privacy" }.
  { kind: 'link', re: /\b(?:href|url):\s*["'`](\/[^"'`?#{}$\s]*)/g },
  // "#" alone leads nowhere; "#name" must name an id in the same file.
  { kind: 'anchor', re: /\bhref=\{?\s*["'`](#[\w-]*)["'`]/g },
  { kind: 'navigate', re: /\b(?:router\.(?:push|replace|prefetch)|redirect|permanentRedirect)\(\s*["'`](\/[^"'`?#{}$\s]*)/g },
  { kind: 'navigate', re: /\bwindow\.location(?:\.href)?\s*=\s*["'`](\/[^"'`?#{}$\s]*)/g },
  { kind: 'api', re: /\bfetch\(\s*["'`](\/api\/[^"'`?#{}$\s]*)/g },
];

function deadPaths() {
  const files = sourceFiles(src);
  const { pages, apis } = routes(files);
  const dead = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const { kind, re } of PATTERNS) {
      for (const m of text.matchAll(re)) {
        let path = m[1];
        const at = `${relative(root, file).split('\\').join('/')}:${text.slice(0, m.index).split('\n').length}`;
        if (kind === 'anchor') {
          const id = path.slice(1);
          if (!id || !new RegExp(`\\bid=\\{?\\s*["'\`]${id}["'\`]`).test(text)) dead.push({ key: `anchor ${path}`, at });
          continue;
        }
        // `/repo/${owner}` is checked as far as its literal start goes.
        const templated = text[m.index + m[0].length] === '$' || text.slice(m.index + m[0].length - 2, m.index + m[0].length + 1).includes('${');
        if (templated) path = path.replace(/\/[^/]*$/, '/x');
        if (kind !== 'api' && path === '/') continue;
        const table = kind === 'api' ? apis : pages;
        const found = table.some((r) => r.re.test(path))
          || (templated && table.some((r) => r.path.startsWith(path.replace(/\/x$/, ''))))
          || (kind === 'link' && existsSync(join(root, 'public', path)) && statSync(join(root, 'public', path)).isFile());
        if (!found) dead.push({ key: `${kind === 'api' ? 'api' : 'page'} ${path}`, at });
      }
    }
  }
  return { dead, pages, apis };
}

test('the scan finds the app: pages and route handlers', () => {
  const { pages, apis } = deadPaths();
  assert.ok(pages.length >= 40, `${pages.length} pages`);
  assert.ok(apis.length >= 25, `${apis.length} API routes`);
  assert.ok(pages.some((p) => p.path === '/download'));
});

test('every internal path leads somewhere, except the open register entries', () => {
  const { dead } = deadPaths();
  const unknown = dead.filter((d) => !KNOWN.has(d.key));
  assert.deepEqual(unknown.map((d) => `${d.key} at ${d.at}`), [], 'a link, navigation or API call that leads nowhere: fix it, or record it in docs/bug-register.md and list it in KNOWN');
  const stillDead = new Set(dead.map((d) => d.key));
  for (const [key, entry] of KNOWN) {
    assert.ok(stillDead.has(key), `${key} (${entry}) leads somewhere now: remove it from KNOWN and mark ${entry} fixed`);
  }
});

// The scan itself must notice what it is for.
test('the scan would notice the two links it was written for', () => {
  const { pages } = deadPaths();
  assert.ok(!pages.some((p) => p.re.test('/downloads')), '/downloads must not be a page, or this guard proves nothing');
  const sample = '<ListItem href="/downloads" />\n<Link href="#">x</Link>\n<a href="#openings">y</a>\n{ href: "/downloads", label: "Downloads" }';
  assert.deepEqual([...sample.matchAll(PATTERNS[0].re)].map((m) => m[1]), ['/downloads']);
  assert.deepEqual([...sample.matchAll(PATTERNS[1].re)].map((m) => m[1]), ['/downloads']);
  assert.deepEqual([...sample.matchAll(PATTERNS[2].re)].map((m) => m[1]), ['#', '#openings']);
});
