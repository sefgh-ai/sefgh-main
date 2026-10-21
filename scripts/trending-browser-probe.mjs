// Real production React in headless Chrome, with browser-only API fixtures.
// After the forwarding probe builds: node scripts/trending-browser-probe.mjs --production [report.json]
// Or use an existing placeholder server: node scripts/trending-browser-probe.mjs http://127.0.0.1:PORT [report.json]
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import net from 'node:net';
import { observeBrowser, devtoolsEndpoint } from './browser-startup.mjs';

async function freePort() {
  const server = net.createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(done => server.close(done)); return port;
}
const startProduction = process.argv[2] === '--production';
const base = new URL(startProduction ? `http://127.0.0.1:${await freePort()}` : process.argv[2] || 'http://127.0.0.1:3000');
assert.ok(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname), 'local placeholder server only');
const report = process.argv[3];
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
assert.ok(chrome, 'Chrome or Edge required');
console.log(`Browser probe executable: ${chrome}`);
const portServer = net.createServer(); portServer.listen(0, '127.0.0.1'); await once(portServer, 'listening');
const port = portServer.address().port; await new Promise(done => portServer.close(done));
const profile = mkdtempSync(join(tmpdir(), 'sefgh-trending-browser-'));
const launchStarted = performance.now();
const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: ['ignore','ignore','pipe'], windowsHide: true });
const browserMonitor=observeBrowser(browser);
const sleep = ms => new Promise(done => setTimeout(done, ms));
async function endpoint(path, method = 'GET') {
  return devtoolsEndpoint({monitor:browserMonitor,port,path,method});
}

function fixtures() {
  const nativeFetch = window.fetch.bind(window);
  const state = window.__trendProbe = { calls: [], fail: false, developerFail: false, slow: false, slowTopics: false, pending: [], pendingTopics: [] };
  const repo = (id, name, language) => ({ id, name, author: 'fixture', description: 'Local browser fixture', language,
    stars: 200, forks: 2, heatLevel: 1, starsPerDay: 10, languageColor: '#888888', contributors: [], url: 'https://github.com/fixture/demo' });
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);
    state.calls.push(url.pathname + url.search);
    if (url.pathname === '/api/github/languages') return Response.json(['rust', 'go']);
    if (url.pathname === '/api/trending/topics') {
      const answer = () => Response.json({ generatedAt: null, topics: [{ repos: [null, 42, [], repo(9, 'Global Python highlight', 'Python'), { id: 10, name: 'Sparse topic fixture' }] }] });
      if (state.slowTopics) return new Promise(done => state.pendingTopics.push(() => done(answer())));
      return answer();
    }
    if (url.pathname === '/api/github/trending-developers') {
      if (state.developerFail) return Response.json({ error: 'fixture outage' }, { status: 502 });
      return Response.json([{ id: 7, rank: 1, name: 'Fixture Developer', username: 'fixture-dev', avatar: '', popularRepo: null }]);
    }
    if (url.pathname === '/api/github/trending') {
      if (state.fail) return Response.json({ error: 'fixture outage' }, { status: 502 });
      const language = url.searchParams.get('language');
      if (state.slow && language === 'rust') return new Promise(done => state.pending.push(() => done(Response.json([repo(2, 'Rust fixture', 'Rust')]))));
      return Response.json([repo(1, language === 'go' ? 'Go fixture' : 'Main repository', language === 'go' ? 'Go' : 'JavaScript')]);
    }
    return Response.json({});
  };
}

async function session(view) {
  const target = await endpoint('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(target.webSocketDebuggerUrl); await once(ws, 'open');
  let id = 0; const pending = new Map(), exceptions = [];
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails?.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await sleep(100); } throw new Error(`UI did not settle: ${expression}`); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*'] }); // no live external services
  await send('Emulation.setDeviceMetricsOverride', { width: view.width, height: 844, deviceScaleFactor: 1, mobile: view.mobile });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(${fixtures.toString()})()` });
  await send('Page.navigate', { url: new URL('/trending', base).href });
  return { evaluate, waitFor, exceptions, close: async () => { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {}); } };
}

const results = [];
let next;
try {
  // Readiness has its own cold-launch budget. Target creation keeps the short
  // per-command budget; the previous eight-second wait could not distinguish
  // a slow, still-live runner process from a protocol failure.
  const version = await devtoolsEndpoint({ monitor: browserMonitor, port, path: '/json/version', timeout: 45000 });
  assert.ok(typeof version?.Browser === 'string' && typeof version?.['Protocol-Version'] === 'string', 'invalid DevTools version response');
  console.log(`Browser ready after ${Math.round(performance.now() - launchStarted)}ms: ${version.Browser.slice(0, 100)}`);
  if (startProduction) {
    next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', base.port], {
      env: { ...process.env, SEFGH_FORWARDING_PROBE: '1', NEXT_PUBLIC_SUPABASE_URL: 'https://probe.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'probe-placeholder', NEXT_TELEMETRY_DISABLED: '1' },
      stdio: 'ignore', windowsHide: true,
    });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (next.exitCode !== null) throw new Error(`production server exited ${next.exitCode}`);
      try { if ((await fetch(new URL('/trending', base), { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
      await sleep(100);
    }
    assert.ok(ready, 'production placeholder server not ready');
  }
  for (const view of [{ name: 'desktop', width: 1280, mobile: false }, { name: 'phone', width: 390, mobile: true }]) {
    const s = await session(view);
    try {
      await s.waitFor(`document.body?.textContent.includes('Main repository') && !!document.querySelector('#topic-highlights-heading')`);
      assert.deepEqual(await s.evaluate(`(() => { const section = document.querySelector('#topic-highlights-heading').closest('section'); return [section.textContent.includes('Global Python highlight'), section.textContent.includes('last 30 days, across all languages'), !section.textContent.includes('Main repository'), !document.body.textContent.includes('1970')]; })()`), [true, true, true, true]);
      const chooseLanguage = async label => {
        await s.evaluate(`[...document.querySelectorAll('[role="combobox"]')].find(e => e.textContent.trim().startsWith('Language:')).click()`);
        await s.waitFor(`[...document.querySelectorAll('[role="option"]')].some(e => e.textContent.trim() === '${label}')`);
        await s.evaluate(`[...document.querySelectorAll('[role="option"]')].find(e => e.textContent.trim() === '${label}').click()`);
      };
      await s.evaluate('window.__trendProbe.slow = true');
      await chooseLanguage('Rust'); await s.waitFor('window.__trendProbe.pending.length === 1');
      await chooseLanguage('Go'); await s.waitFor(`document.body.textContent.includes('Go fixture')`);
      await s.evaluate('window.__trendProbe.pending.shift()()'); await sleep(150);
      assert.equal(await s.evaluate(`document.body.textContent.includes('Rust fixture')`), false, 'old response replaced filtered list');
      assert.equal(await s.evaluate(`document.querySelector('#topic-highlights-heading').closest('section').textContent.includes('Global Python highlight')`), true);

      await s.evaluate(`window.__trendProbe.fail = true; window.__trendProbe.calls = []; [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Refresh Trending').click()`);
      await s.waitFor(`document.body.textContent.includes('Could not refresh trending')`);
      assert.equal(await s.evaluate(`document.body.textContent.includes('Trending updated')`), false);
      assert.equal(await s.evaluate(`window.__trendProbe.calls.some(p => p.includes('trending-developers'))`), false);
      await s.evaluate(`window.__trendProbe.fail = false; window.__trendProbe.slowTopics = true; window.__trendProbe.developerFail = true; [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Refresh Trending').click()`);
      await s.waitFor('window.__trendProbe.pendingTopics.length === 1');
      await s.evaluate(`[...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Developers').click()`);
      await s.waitFor(`document.body.textContent.includes('Trending developers could not be loaded')`);
      assert.equal(await s.evaluate(`[...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Refresh Trending').disabled`), false);
      await s.evaluate('window.__trendProbe.pendingTopics.shift()()'); await sleep(100);
      assert.equal(await s.evaluate(`document.body.textContent.includes('Trending updated')`), false, 'stale refresh success');
      assert.equal(await s.evaluate(`!!document.querySelector('#topic-highlights-heading')`), false);
      await s.evaluate(`window.__trendProbe.developerFail = false; window.__trendProbe.calls = []; [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Refresh Trending').click()`);
      await s.waitFor(`window.__trendProbe.calls.length > 0 && [...document.querySelectorAll('button')].some(e => e.textContent.trim() === 'Refresh Trending' && !e.disabled)`);
      await s.waitFor(`document.body.textContent.includes('Fixture Developer') && document.body.textContent.includes('No repositories')`);
      assert.deepEqual(await s.evaluate('window.__trendProbe.calls'), ['/api/github/trending-developers?since=daily']);
      assert.equal(await s.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false, 'horizontal overflow');
      assert.deepEqual(s.exceptions, [], 'uncaught browser exception');
      results.push({ view: view.name, checks: ['separate labeled highlights', 'invalid/sparse rows and date', 'latest filter wins', 'honest refresh', 'scope change invalidates pending refresh and spinner', 'active-tab-only refresh', 'no overflow or uncaught exceptions'] });
      console.log(`${view.name}: seven browser checks passed`);
    } finally { await s.close(); }
  }
  if (report) writeFileSync(report, JSON.stringify(results, null, 2) + '\n');
} finally {
  if (next && next.exitCode === null) { const stopped = once(next, 'exit'); next.kill(); await Promise.race([stopped, sleep(3000)]); }
  if (browser.pid && browser.exitCode === null && browser.signalCode === null) { const stopped = once(browser, 'exit'); browser.kill(); await Promise.race([stopped, sleep(3000)]); }
  browserMonitor.dispose();
  const root = resolve(tmpdir()) + sep;
  if (resolve(profile).startsWith(root) && resolve(profile).split(sep).at(-1).startsWith('sefgh-trending-browser-')) {
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
