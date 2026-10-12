// Optional integration check. Build backend/cmd/api and pass its executable
// as argv[2]. Requires an existing Next production build with Go switches off.
// All upstream calls stay on localhost; no credentials or live GitHub needed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

const executable = process.argv[2];
assert.ok(executable, 'pass the path to the built Go API executable');
const children = [];
let upstream;

async function freePort() {
  const server = http.createServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
function start(command, args, env) {
  const child = spawn(command, args, {env: {...process.env, ...env}, stdio: 'ignore', windowsHide: true});
  children.push(child);
  child.on('error', error => { console.error(error.message); });
  return child;
}
async function ready(url, child) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited ${child.exitCode}`);
    try { await fetch(url, {signal: AbortSignal.timeout(1000)}); return; } catch { await delay(150); }
  }
  throw new Error(`server did not become ready: ${url}`);
}
async function check(origin, path, body, go = true, status = 200) {
  const response = await fetch(origin + path, {signal: AbortSignal.timeout(30_000)});
  assert.equal(response.status, status);
  assert.equal(response.headers.get('x-sefgh-backend'), go ? 'go' : null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await response.json(), body);
}

try {
  const repo = {id: 42, name: 'demo', full_name: 'octo/demo'};
  upstream = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('x-ratelimit-remaining', '59');
    if (req.url.endsWith('/languages')) res.end('{"Go":42}');
    else if (req.url.endsWith('/readme')) res.end('# Demo');
    else if (req.url.includes('/contents/')) res.end('[]');
    else res.end(JSON.stringify({...repo, languages_url: `${github}/repos/octo/demo/languages`}));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const github = `http://127.0.0.1:${upstream.address().port}`;
  const goPort = await freePort(), nextPort = await freePort(), offPort = await freePort();
  const goOrigin = `http://127.0.0.1:${goPort}`;
  const go = start(executable, [], {SEFGH_API_ADDR: `127.0.0.1:${goPort}`, GITHUB_API_URL: github, GITHUB_TOKEN: 'fixture-token'});
  await ready(goOrigin + '/healthz', go);
  const cases = [
    ['/api/github/repo?owner=octo&name=demo', repo],
    ['/api/github/repo/octo/demo', {repository: {...repo, languages_url: `${github}/repos/octo/demo/languages`}, languages: {Go: 42}, readme: '# Demo', rate_limit: {remaining: '59', reset: null}}],
    ['/api/github/contents/octo/demo?path=src', {contents: [], rate_limit: {remaining: '59', reset: null}}],
  ];
  for (const [path, body] of cases) await check(goOrigin, path, body);
  console.log('PASS: compiled Go server serves all three routes with security headers');

  const next = start(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(nextPort), '--hostname', '127.0.0.1'], {
    SEFGH_GO_API_URL: goOrigin, SEFGH_GO_ROUTES: 'github-repo,github-repo-details,github-contents', GITHUB_TOKEN: '',
  });
  const nextOrigin = `http://127.0.0.1:${nextPort}`;
  await ready(nextOrigin + '/api/github/repo', next);
  for (const [path, body] of cases) await check(nextOrigin, path, body);
  const unrelated = await fetch(nextOrigin + '/api/github/languages');
  assert.equal(unrelated.status, 200); assert.equal(unrelated.headers.get('x-sefgh-backend'), null);
  console.log('PASS: Next dev forwards all selected routes; unrelated route stays in Next');

  const off = start(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(offPort), '--hostname', '127.0.0.1'], {
    SEFGH_GO_API_URL: '', SEFGH_GO_ROUTES: '', GITHUB_TOKEN: '',
  });
  const offOrigin = `http://127.0.0.1:${offPort}`;
  await ready(offOrigin + '/api/github/repo', off);
  await check(offOrigin, '/api/github/repo', {error: 'Owner and name parameters are required'}, false, 400);
  await check(offOrigin, '/api/github/contents/octo/demo?path=..', {error: 'Invalid path parameter'}, false, 400);
  console.log('PASS: production build with switches off keeps Next handlers');
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      const stop = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {stdio: 'ignore', windowsHide: true});
      await once(stop, 'exit');
    } else { child.kill('SIGTERM'); await once(child, 'exit'); }
  }
  if (upstream) await new Promise(resolve => upstream.close(resolve));
}
