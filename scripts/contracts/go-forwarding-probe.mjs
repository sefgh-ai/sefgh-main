// Optional integration check: does the Next.js rewrite hand a request to the
// Go backend unchanged?
//
// Each path is sent twice: straight to the compiled Go server, and to a
// Next.js dev server that forwards the route to that same Go server. Go's own
// behaviour is already pinned by the contract fixtures, so any difference
// between the two answers, or in what the stand-in GitHub then receives, is
// something the forwarding step changed. The paths are chosen to be awkward:
// percent-encoded slashes, a lone "%", repeated parameters, bytes that are
// not valid UTF-8.
//
// Build backend/cmd/api, then from the repository root:
//   node scripts/contracts/go-forwarding-probe.mjs <path to the Go executable>
// Set PROBE_SHOW=1 to list every path with what reached the stand-in GitHub.
// It exits with status 1 if any path differs. Everything stays on localhost:
// no credentials, no live GitHub. It is not part of npm run test:contracts,
// because it starts servers and takes about a minute.
//
// Add --production to build and check `next start` in an isolated output folder.
// A deployment on Vercel forwards through Vercel's
// own routing layer, which has to be checked there.
import { spawn } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";

const executable = process.argv[2];
if (!executable) throw new Error("pass the path to the built Go API executable");
const production = process.argv.includes('--production');
const children = [];
let upstream;

async function freePort() {
  const server = http.createServer();
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}
function start(command, args, env, stdio = 'ignore') {
  const child = spawn(command, args, { env: { ...process.env, ...env }, stdio, windowsHide: true });
  children.push(child);
  return child;
}
async function ready(url, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited ${child.exitCode}`);
    try { await fetch(url, { signal: AbortSignal.timeout(2000) }); return; } catch { await delay(200); }
  }
  throw new Error(`server did not become ready: ${url}`);
}
// A raw request, so that the path is sent exactly as written. fetch() would
// tidy some of these before they left.
// `body`, when given, makes it a POST of that exact text as JSON.
function raw(port, path, headers, body) {
  return new Promise((resolve) => {
    const sent = body === undefined ? headers : { ...headers, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) };
    const req = http.request({ host: "127.0.0.1", port, path, headers: sent, method: body === undefined ? "GET" : "POST" }, (res) => {
      let body = ""; res.setEncoding("utf8");
      res.on("data", (d) => (body += d)).on("end", () => resolve({ status: res.statusCode, backend: res.headers["x-sefgh-backend"] ?? null, cache: res.headers['cache-control'] ?? null, body }));
    });
    req.on("error", (e) => resolve({ status: 0, backend: null, body: String(e.message) }));
    req.setTimeout(60_000, () => req.destroy(new Error("timeout")));
    req.end(body);
  });
}

const probes = [
  "/api/github/repo/octo/demo",
  "/api/github/repo/octo/next.js",
  "/api/github/repo/octo_corp/demo",
  "/api/github/repo/a%2Fb/demo",
  "/api/github/repo/octo/a%20b",
  "/api/github/repo/octo/a%23b",
  "/api/github/repo/octo/a%3Fb",
  "/api/github/repo/octo/a%25b",
  "/api/github/repo/-octo/demo",
  "/api/github/repo?owner=octo&name=demo",
  "/api/github/repo?owner=octo&name=demo&owner=other&name=other",
  "/api/github/repo?name=demo&owner=octo",
  "/api/github/repo?owner=..&name=..%2Fuser",
  "/api/github/repo?owner=octo&name=a+b",
  "/api/github/contents/octo/demo",
  "/api/github/contents/octo/demo?path=src/main.go",
  "/api/github/contents/octo/demo?path=src%2Fmain.go",
  "/api/github/contents/octo/demo?path=docs/C%23/readme.md",
  "/api/github/contents/octo/demo?path=a%20b",
  "/api/github/contents/octo/demo?path=a+b",
  "/api/github/contents/octo/demo?path=50%25",
  "/api/github/contents/octo/demo?path=a%3Fref%3Dx",
  "/api/github/contents/octo/demo?path=%E6%97%A5.txt",
  "/api/github/contents/octo/demo?path=%252e%252e%2Fprivate",
  "/api/github/contents/octo/demo?path=..",
  "/api/github/contents/octo/demo?path=a%0Ab",
  "/api/github/contents/a%2Fb/demo?path=src",
  "/api/github/search?q=react",
  "/api/github/search?q=machine+learning",
  "/api/github/search?q=c%2B%2B%20%26%20rust",
  "/api/github/search?q=it%27s%20(fun)!*",
  "/api/github/search?q=first&q=second",
  "/api/github/search?q=%E6%97%A5%E6%9C%AC",
  "/api/github/search?q=a;b",
  "/api/github/search?q=a=b",
  "/api/github/search?q=50%",
  "/api/github/search?q=%zz",
  "/api/github/search?q=a%FF%FFb",
  "/api/github/search?q=%20",
  "/api/github/search?q=react&language=C%23",
  "/api/github/search?q=react&language=Jupyter%20Notebook&stars=%3E100",
  "/api/github/search?q=react&page=2&per_page=12",
  "/api/github/search?%71=react",
  "/api/github/languages",
  "/api/github/trending?since=weekly&language=Go",
  "/api/github/trending-developers?since=weekly",
  "/api/github/trending-developers?since=invalid",
  "/api/github/trending?since=invalid",
  "/api/github/trending?language=C%23",
  "/api/github/contributions?username=octocat",
  "/api/github/contributions?username=-bad-",
];
const scenarios = [
  ...probes.map(path => ({ path })),
  { path: '/api/github/repo?owner=octo&name=private', headers: { Authorization: 'Bearer session-a', 'X-GitHub-Token': 'fixture-user' }, status: 200 },
  { path: '/api/github/search?q=private', headers: { Authorization: 'Bearer session-a', 'X-GitHub-Token': 'fixture-user' }, status: 200 },
  { path: '/api/github/repo?owner=octo&name=private', headers: { Authorization: 'Bearer session-a', 'X-GitHub-Token': 'fixture-other' }, status: 403 },
  { path: '/api/github/repo?owner=octo&name=private', headers: { Authorization: 'Bearer wrong-session', 'X-GitHub-Token': 'fixture-user' }, status: 401 },
  // POST bodies through the rewrite. No OpenAI or Anthropic key is set, and
  // the suggestion cases never reach an AI call. Chat does: its provider is
  // the stand-in's /models, and its sign-in check the stand-in's Supabase.
  { path: '/api/ai/suggestions', body: '{"query":"rea"}' },
  { path: '/api/ai/suggestions', body: '{"query":"a"}' },
  { path: '/api/ai/suggestions', body: '{broken' },
  { path: '/api/ai/suggestions', body: 'null' },
  { path: '/api/ai/enhance-query', body: '{"query":"web charts"}' },
  { path: '/api/ai/enhance-query', body: '{"query":"  \u65e5\u672c\u8a9e web  "}' },
  { path: '/api/ai/enhance-query', body: '{"query":""}' },
  { path: '/api/ai/enhance-query', body: JSON.stringify({ query: 'k'.repeat(501) }) },
  // Chat answers per user and sets no Cache-Control, so `cache` is null.
  { path: '/api/ai/chat', body: '{"messages":[{"role":"user","content":"hi"}]}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/ai/chat', body: '{"messages":[{"role":"user","content":"How do I deploy?"}],"action":"generate_title"}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/ai/chat', body: '{"messages":[]}', headers: { Authorization: 'Bearer session-a' }, status: 400, cache: null },
  { path: '/api/ai/chat', body: '{broken', headers: { Authorization: 'Bearer session-a' }, status: 500, cache: null },
  { path: '/api/ai/chat', body: '{"messages":[{"role":"user","content":"hi"}]}', headers: { Authorization: 'Bearer wrong-session' }, status: 401, cache: null },
  { path: '/api/ai/chat', body: '{"messages":[{"role":"user","content":"hi"}]}' },
  // Activity reads the database as the caller; it sets no Cache-Control.
  { path: '/api/activity', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/activity', headers: { Authorization: 'Bearer wrong-session' }, status: 401, cache: null },
  { path: '/api/activity' },
];

try {
  const seen = [];
  let github;
  upstream = http.createServer((req, res) => {
    let body = ""; req.on("data", (d) => (body += d)).on("end", () => {
      seen.push(`${req.method} ${req.url}`);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("x-ratelimit-remaining", "59");
      if (req.url === '/auth/v1/user') {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') {
          res.writeHead(401); res.end('{}'); return;
        }
        res.end(JSON.stringify({ id: 'a', identities: [{ provider: 'github', id: '101' }] }));
      }
      // The Data API answers only the caller's own session, with the public key.
      else if (req.url.startsWith('/rest/v1/activity_logs?')) {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') {
          res.writeHead(401); res.end('{}'); return;
        }
        res.end(JSON.stringify([{ activity_date: new Date().toISOString().slice(0, 10), activity_count: 3 }]));
      }
      else if (req.url === '/user') {
        const id = { 'Bearer fixture-user': 101, 'Bearer fixture-other': 102 }[req.headers.authorization];
        if (!id) { res.writeHead(401); res.end('{}'); return; }
        res.end(JSON.stringify({ id }));
      }
      else if (req.url === '/models') res.end(JSON.stringify({ choices: [{ message: { content: 'Hello!' } }] }));
      else if (req.url === "/graphql") res.end(JSON.stringify({ data: { user: { contributionsCollection: { contributionCalendar: { totalContributions: 0, weeks: [] } } } } }));
      else if (req.url.startsWith("/search/")) res.end(JSON.stringify({ total_count: 0, items: [] }));
      else if (req.url.endsWith("/languages")) res.end('{"Go":42}');
      else if (req.url.endsWith("/readme")) res.end("# Demo");
      else if (req.url.includes("/contents/")) res.end("[]");
      // full_name repeats the path that was asked for, so a reply served from
      // the Go cache still shows which repository the request reached.
      else res.end(JSON.stringify({ id: 42, name: "demo", full_name: req.url.slice("/repos/".length), languages_url: `${github}/repos/octo/demo/languages` }));
    });
  });
  upstream.listen(0, "127.0.0.1"); await once(upstream, "listening");
  github = `http://127.0.0.1:${upstream.address().port}`;

  const goPort = await freePort(), nextPort = await freePort();
  const go = start(executable, [], { SEFGH_API_ADDR: `127.0.0.1:${goPort}`, GITHUB_API_URL: github, GITHUB_TOKEN: "fixture-token", NEXT_PUBLIC_SUPABASE_URL: github, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-public-key',
    // Never let a real key from the surrounding shell reach a real provider:
    // the keys are emptied and every provider address points at the stand-in.
    OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', SEFGH_AI_MODELS_URL: `${github}/models`, SEFGH_OPENAI_URL: `${github}/openai`, SEFGH_ANTHROPIC_URL: `${github}/anthropic`,
    // The public read token's rules have their own contract; here it is off.
    GITHUB_PUBLIC_READ_TOKEN: '' });
  await ready(`http://127.0.0.1:${goPort}/healthz`, go);
  const routes = "github-search,github-languages,github-trending,github-trending-developers,github-contributions,github-repo,github-repo-details,github-contents,ai-suggestions,ai-enhance-query,ai-chat,activity";
  const nextEnv = {
    SEFGH_GO_API_URL: `http://127.0.0.1:${goPort}`, SEFGH_GO_ROUTES: routes, GITHUB_TOKEN: "", GITHUB_PUBLIC_READ_TOKEN: "",
    SEFGH_FORWARDING_PROBE: '1', NEXT_TELEMETRY_DISABLED: '1',
    // This probe never needs a real Supabase account or browser session.
    NEXT_PUBLIC_SUPABASE_URL: 'https://probe.invalid',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'probe-placeholder',
  };
  if (production) {
    const build = start(process.execPath, ['node_modules/next/dist/bin/next', 'build'], nextEnv, 'inherit');
    const [code] = await once(build, 'exit');
    if (code !== 0) throw new Error(`production build exited ${code}`);
  }
  const next = start(process.execPath, ["node_modules/next/dist/bin/next", production ? "start" : "dev", "--port", String(nextPort), "--hostname", "127.0.0.1"], nextEnv);
  await ready(`http://127.0.0.1:${nextPort}/api/github/languages`, next);
  console.log("servers ready; probing", scenarios.length, "requests\n");

  // Summary answers are cached by the Go server, so a second identical
  // request makes no upstream call. Count only what each request triggers.
  const ask = async (port, path, headers, body) => {
    const before = seen.length;
    const answer = await raw(port, path, headers, body);
    return { ...answer, upstream: seen.slice(before) };
  };

  let same = 0;
  const different = [];
  for (const { path, headers, status, body, cache = 'private, no-store' } of scenarios) {
    // Via Next first, then direct. On the cached summary route the second
    // request makes no upstream call, so those are compared on the reply
    // only; the reply carries the upstream path in full_name.
    const viaNext = await ask(nextPort, path, headers, body);
    const direct = await ask(goPort, path, headers, body);
    const cached = !headers && path.startsWith("/api/github/repo?");
    const equal = viaNext.status === direct.status && viaNext.body === direct.body && viaNext.backend === "go" &&
      (!headers || (viaNext.status === status && viaNext.cache === cache)) &&
      (cached || JSON.stringify(viaNext.upstream) === JSON.stringify(direct.upstream));
    if (equal) same++;
    else different.push({ path, viaNext, direct });
    if (process.env.PROBE_SHOW) console.log(`${equal ? "same" : "DIFF"} ${String(viaNext.status).padEnd(4)}${path.padEnd(62)} -> ${viaNext.upstream.join(" , ").slice(0, 110) || "(no upstream call)"}`);
  }
  console.log(`identical through Next.js and direct: ${same} of ${scenarios.length}`);
  if (different.length > 0) process.exitCode = 1;
  for (const d of different) {
    console.log(`\nDIFFERENT  ${d.path}`);
    console.log(`  direct   : ${d.direct.status} backend=${d.direct.backend} ${d.direct.body.slice(0, 90)} | upstream ${JSON.stringify(d.direct.upstream)}`);
    console.log(`  via Next : ${d.viaNext.status} backend=${d.viaNext.backend} ${d.viaNext.body.slice(0, 90)} | upstream ${JSON.stringify(d.viaNext.upstream)}`);
  }
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      const stop = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      await once(stop, "exit");
    } else {
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      await stopped;
      clearTimeout(timer);
    }
  }
  if (upstream) await new Promise((r) => upstream.close(r));
}
