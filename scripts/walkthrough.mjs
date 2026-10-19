// A signed-out walk-through of the website's pages in headless Chrome
// (Phase 6, BUG-010), at desktop and phone width. For each page it records
// console errors and uncaught exceptions (content security policy reports
// included), requests that failed or answered 4xx/5xx, whether the page
// scrolls sideways at that width, and how many requests it made after it
// had settled: a page that keeps asking is looping.
//
// It drives Chrome through the DevTools protocol, with Node's own WebSocket;
// nothing is installed. Point it at a running build:
//
//   node scripts/walkthrough.mjs http://127.0.0.1:3000 [report.json]
//
// Run the build with placeholder Supabase settings, so no real data is
// touched (see docs/coordination.md, BUG-010).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const reportFile = process.argv[3];
const PAGES = ['/', '/about', '/accessibility', '/api-reference', '/blog', '/brand', '/business', '/careers', '/chat', '/code-of-conduct',
  '/contact', '/cookie-policy', '/docs', '/download', '/faq', '/feedback', '/forum', '/help', '/history', '/home', '/links', '/login',
  '/news', '/notifications', '/playground', '/pricing', '/privacy', '/profile', '/research', '/search', '/settings', '/signup',
  '/sitemap-preview', '/starred', '/status', '/submissions', '/terms', '/terms-of-use', '/trending', '/versions',
  '/auth/update-password', '/repo/vercel/next.js', '/s/no-such-share', '/no-such-page'];
const WIDTHS = [{ name: 'desktop', width: 1280, height: 800, mobile: false }, { name: 'phone', width: 390, height: 844, mobile: true }];
const SETTLE_MS = 4000;
const QUIET_MS = 5000;

const chromePaths = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const chrome = chromePaths.find((p) => existsSync(p));
if (!chrome) throw new Error('no Chrome or Edge found');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'sefgh-walk-'));
const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

async function json(path, method = 'GET') {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}${path}`, { method });
      if (r.ok) return r.json();
    } catch {}
    await sleep(200);
  }
  throw new Error(`DevTools did not answer ${path}`);
}

// One DevTools session on a page target.
async function session() {
  const target = await json('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    } else if (message.method) {
      for (const listen of listeners) listen(message);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  return { send, on: (listen) => listeners.push(listen), close: () => { ws.close(); return json(`/json/close/${target.id}`).catch(() => {}); } };
}

async function visit(path, view) {
  const s = await session();
  const found = { path, view: view.name, errors: [], failed: [], requestsAfterSettle: 0, overflow: false, status: null };
  let settled = false;
  s.on(({ method, params }) => {
    if (method === 'Runtime.exceptionThrown') found.errors.push(`exception: ${params.exceptionDetails?.exception?.description?.split('\n')[0] ?? params.exceptionDetails?.text}`);
    if (method === 'Runtime.consoleAPICalled' && params.type === 'error') found.errors.push(`console: ${params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200)}`);
    if (method === 'Log.entryAdded' && params.entry.level === 'error') found.errors.push(`${params.entry.source}: ${params.entry.text.slice(0, 200)}`);
    if (method === 'Network.requestWillBeSent' && settled) found.requestsAfterSettle++;
    if (method === 'Network.responseReceived') {
      const { url, status } = params.response;
      if (params.type === 'Document' && url.startsWith(base)) found.status = status;
      if (status >= 400) found.failed.push(`${status} ${url.replace(base, '')}`);
    }
    if (method === 'Network.loadingFailed' && !params.canceled) found.failed.push(`failed ${params.errorText} (${params.type})`);
  });
  await s.send('Page.enable');
  await s.send('Network.enable');
  await s.send('Runtime.enable');
  await s.send('Log.enable');
  await s.send('Emulation.setDeviceMetricsOverride', { width: view.width, height: view.height, deviceScaleFactor: 1, mobile: view.mobile });
  await s.send('Page.navigate', { url: base + path });
  await sleep(SETTLE_MS);
  settled = true;
  await sleep(QUIET_MS);
  const { result } = await s.send('Runtime.evaluate', { expression: 'document.documentElement.scrollWidth > window.innerWidth + 1', returnByValue: true });
  found.overflow = result.value === true;
  await s.close();
  return found;
}

const results = [];
try {
  await json('/json/version');
  for (const path of PAGES) {
    for (const view of WIDTHS) {
      const found = await visit(path, view);
      results.push(found);
      const notes = [found.errors.length && `${found.errors.length} errors`, found.failed.length && `${found.failed.length} failed`, found.overflow && 'overflow', found.requestsAfterSettle > 2 && `${found.requestsAfterSettle} requests after settling`].filter(Boolean);
      console.log(`${String(found.status).padEnd(4)} ${view.name.padEnd(8)} ${path.padEnd(24)} ${notes.join(', ') || 'clean'}`);
    }
  }
} finally {
  browser.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
if (reportFile) writeFileSync(reportFile, JSON.stringify(results, null, 2) + '\n');
