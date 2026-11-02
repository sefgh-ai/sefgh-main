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
// Add --public-reads for P7-02 or --shares for P7-03 forwarding scenarios.
// A deployment on Vercel forwards through Vercel's
// own routing layer, which has to be checked there.
import { spawn } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { checkPhase2 } from './phase2-probe.mjs';

const executable = process.argv[2];
if (!executable) throw new Error("pass the path to the built Go API executable");
const production = process.argv.includes('--production');
const phase2 = process.argv.includes('--phase2');
const publicReadsOnly = process.argv.includes('--public-reads');
const sharesOnly = process.argv.includes('--shares');
if (publicReadsOnly && sharesOnly) throw new Error('choose one probe scope');
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
function raw(port, path, headers, body, method) {
  return new Promise((resolve) => {
    const sent = body === undefined ? headers : { ...headers, "Content-Type": headers?.['Content-Type'] ?? "application/json", "Content-Length": Buffer.byteLength(body) };
    const req = http.request({ host: "127.0.0.1", port, path, headers: sent, method: method ?? (body === undefined ? "GET" : "POST") }, (res) => {
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
];
const avatarBoundary = 'sefgh-avatar-probe';
const avatarMultipart = `--${avatarBoundary}\r\nContent-Disposition: form-data; name="avatar"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\nPNG\r\n--${avatarBoundary}--\r\n`;
const allScenarios = [
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
  // Starred reads the database as the caller, then GitHub with no credential.
  { path: '/api/repo/starred', headers: { Authorization: 'Bearer session-a' }, status: 200 },
  { path: '/api/repo/starred', headers: { Authorization: 'Bearer wrong-session' }, status: 401, cache: null },
  { path: '/api/repo/starred' },
  // A share is read with the visitor's bearer, or the public key signed out;
  // it sets no Cache-Control. The token is a path segment, so awkward ones
  // test how each layer decodes it.
  { path: '/api/share/tok-public' },
  { path: '/api/share/tok-public/fork', method: 'GET' },
  { path: '/api/conversations/c1/share', method: 'GET' },
  { path: '/api/share/tok-public', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/share/tok-private', headers: { Authorization: 'Bearer session-a' }, status: 403, cache: null },
  { path: '/api/share/tok-private' },
  { path: '/api/share/no%20such%20link' },
  { path: '/api/share/a%2Fb' },
  { path: '/api/share/caf%C3%A9' },
  // Collect reads and writes the database as the caller; signed out, a read
  // goes with the public key. It sets no Cache-Control.
  { path: '/api/repo/collect?repo=octo%2Fdemo' },
  { path: '/api/repo/collect?repo=a%2Bb+c' },
  { path: '/api/repo/collect?repo=octo%2Fdemo', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/collect', body: '{"repoFullName":"octo/demo"}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/collect', body: '{broken', headers: { Authorization: 'Bearer session-a' }, status: 500, cache: null },
  { path: '/api/repo/collect', body: '{"repoFullName":"octo/demo"}' },
  { path: '/api/repo/collect?repo=octo%2Fdemo&collection=work', method: 'DELETE', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/collect?repo=octo%2Fdemo', method: 'DELETE' },
  // Votes: the stand-in has no stats function, as the live database, so a
  // vote is counted by hand after the call fails. No Cache-Control.
  { path: '/api/repo/vote?repo=octo%2Fdemo' },
  { path: '/api/repo/vote?repo=octo%2Fdemo', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/vote', body: '{"repoFullName":"octo/demo","voteType":"upvote"}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/vote', body: '{"repoFullName":"octo/demo","voteType":null}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/vote', body: '{"repoFullName":"octo/demo","voteType":"sideways"}', headers: { Authorization: 'Bearer session-a' }, status: 400, cache: null },
  { path: '/api/repo/vote', body: '{"repoFullName":"octo/demo","voteType":"upvote"}' },
  // Ratings: read by anyone, written by the signed-in user. No Cache-Control.
  { path: '/api/repo/rating?repo=octo%2Fdemo' },
  { path: '/api/repo/rating?repo=octo%2Fdemo', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/rating', body: '{"repoFullName":"octo/demo","rating":4,"reviewText":"Solid"}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/rating', body: '{"repoFullName":"octo/demo","rating":9}', headers: { Authorization: 'Bearer session-a' }, status: 400, cache: null },
  { path: '/api/repo/rating?repo=octo%2Fdemo', method: 'DELETE', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/rating?repo=octo%2Fdemo', method: 'DELETE' },
  // Comment votes: only a signed-in caller reaches the database.
  { path: '/api/repo/comments/vote?commentId=c1' },
  { path: '/api/repo/comments/vote?commentId=c1', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/comments/vote', body: '{"commentId":"c1","voteType":"upvote"}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/comments/vote', body: '{"commentId":"c1","voteType":null}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/comments/vote', body: '{"commentId":"c1","voteType":"upvote"}' },
  // Comments: a list with each author's details and reply count, a new
  // comment, an edit and a deletion. No Cache-Control.
  { path: '/api/repo/comments?repo=octo%2Fdemo' },
  { path: '/api/repo/comments?repo=octo%2Fdemo&limit=%207px&offset=0x2', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/comments', body: '{"repoFullName":"octo/demo","commentText":"  Nice  "}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/comments', body: '{"commentId":"c1","commentText":"Edited"}', method: 'PATCH', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/comments?id=c1', method: 'DELETE', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/comments', body: '{"repoFullName":"octo/demo","commentText":"Hi"}' },
  // Videos: a list with each uploader's details, a new video whose id ends
  // in half of an emoji, and a deletion. No Cache-Control.
  { path: '/api/repo/videos?repo=octo%2Fdemo' },
  { path: '/api/repo/videos?repo=octo%2Fdemo', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/videos', body: '{"repoFullName":"octo/demo","videoUrl":"https://youtu.be/abcdefghij\u{1F600}","title":"Demo"}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/videos?id=v1', method: 'DELETE', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/repo/videos', body: '{"repoFullName":"octo/demo","videoUrl":"https://example.test/clip.mp4"}' },
  // Conversation shares and forks: only a signed-in caller reaches the
  // database. No Cache-Control.
  { path: '/api/conversations/c1/share', body: '{"title":"Mine","isPublic":true}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/conversations/a%2Fb/share', body: '{}', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/conversations/c1/share', body: '{', headers: { Authorization: 'Bearer session-a' }, status: 500, cache: null },
  { path: '/api/conversations/c1/share', method: 'DELETE', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/conversations/c1/share', body: '{}' },
  { path: '/api/share/tok-public/fork', body: '', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: null },
  { path: '/api/share/tok-private/fork', body: '', headers: { Authorization: 'Bearer session-b' }, status: 401, cache: null },
  { path: '/api/share/tok-public/fork', body: '' },
  { path: '/api/upload-avatar', body: avatarMultipart, headers: { Authorization: 'Bearer session-a', 'Content-Type': `multipart/form-data; boundary=${avatarBoundary}` }, status: 200, cache: null },
  { path: '/api/upload-avatar', body: avatarMultipart.replace('image/png', 'text/plain'), headers: { Authorization: 'Bearer session-a', 'Content-Type': `multipart/form-data; boundary=${avatarBoundary}` }, status: 400, cache: null },
  { path: '/api/upload-avatar', body: '{}', headers: { Authorization: 'Bearer session-a' }, status: 500, cache: null },
  { path: '/api/upload-avatar', body: avatarMultipart, headers: { Authorization: 'Bearer session-b', 'Content-Type': `multipart/form-data; boundary=${avatarBoundary}` }, status: 401, cache: null },
  { path: '/api/upload-avatar', body: avatarMultipart },
  // Trending topics: six public searches, one shared answer for everyone,
  // with the CDN cache header.
  { path: '/api/trending/topics' },
  { path: '/api/trending/topics', headers: { Authorization: 'Bearer session-a', 'X-GitHub-Token': 'fixture-user' }, status: 200, cache: 'public, max-age=0, s-maxage=21600, stale-while-revalidate=3600' },
  // Search history (DATA-001b), a browser data area switched by
  // NEXT_PUBLIC_SEFGH_GO_DATA: the caller's own rows only, never cached.
  { path: '/api/search-history?user=a&offset=0&limit=50', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: 'private, no-store' },
  { path: '/api/search-history/count?user=a', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: 'private, no-store' },
  { path: '/api/search-history', body: '{"user":"a","query":"rust","source":"search","filters":{},"resultsCount":0}', headers: { Authorization: 'Bearer session-a', 'Content-Type': 'application/json' }, status: 200, cache: 'private, no-store' },
  { path: '/api/search-history/h1', method: 'DELETE', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: 'private, no-store' },
  { path: '/api/search-history/h%2F1', method: 'DELETE', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: 'private, no-store' },
  { path: '/api/search-history?user=a&source=chat', method: 'DELETE', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: 'private, no-store' },
  { path: '/api/search-history?user=a&offset=0&limit=50' },
  // Onboarding (DATA-002): each answer is the database call's own result.
  { path: '/api/onboarding?user=a', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: 'private, no-store' },
  { path: '/api/onboarding?user=b', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: 'private, no-store' },
  { path: '/api/onboarding', body: '{"user":"a"}', headers: { Authorization: 'Bearer session-a', 'Content-Type': 'application/json' }, status: 200, cache: 'private, no-store' },
  { path: '/api/onboarding', method: 'PATCH', body: '{"user":"a","updates":{"current_step":3}}', headers: { Authorization: 'Bearer session-a', 'Content-Type': 'application/json' }, status: 200, cache: 'private, no-store' },
  { path: '/api/onboarding', method: 'PATCH', body: '{"user":"a","updates":{"user_id":"b"}}', headers: { Authorization: 'Bearer session-a', 'Content-Type': 'application/json' }, status: 200, cache: 'private, no-store' },
  { path: '/api/onboarding?user=a' },
  // The data proxy (DATA-PROXY-001): Data API requests passed on unchanged,
  // or refused by the area's rules.
  // Next's rewrite writes the query again, so it is given as supabase-js writes it.
  { path: '/api/data/home/rest/v1/projects?select=*&order=created_at.desc', headers: { Authorization: 'Bearer session-a' }, status: 200, cache: 'private, no-store' },
  { path: '/api/data/conversations/rest/v1/user_conversations?id=eq.c1', method: 'PATCH', body: '{"title":"Renamed"}', headers: { Authorization: 'Bearer session-a', 'Content-Type': 'application/json' }, status: 200, cache: 'private, no-store' },
  { path: '/api/data/user-stats/rest/v1/user_stats?user_id=eq.a', method: 'PATCH', body: '{"xp":99999}', headers: { Authorization: 'Bearer session-a', 'Content-Type': 'application/json' }, status: 403, cache: 'private, no-store' },
  // BUG-011: the public-schema policy cannot select another schema.
  { path: '/api/data/home/rest/v1/projects?select=*', headers: { Authorization: 'Bearer session-a', 'Accept-Profile': 'private' }, status: 403, cache: 'private, no-store' },
  { path: '/api/data/conversations/rest/v1/user_conversations?id=eq.c1', method: 'PATCH', body: '{"title":"Renamed"}', headers: { Authorization: 'Bearer session-a', 'Content-Type': 'application/json', 'Content-Profile': 'private' }, status: 403, cache: 'private, no-store' },
  { path: '/api/data/home/rest/v1/projects?select=*', headers: { Authorization: 'Bearer session-a', 'Accept-Profile': 'public' }, status: 200, cache: 'private, no-store' },
];
const scenarios = publicReadsOnly ? allScenarios.filter(scenario => scenario.path.startsWith('/api/github/'))
  : sharesOnly ? allScenarios.filter(scenario => scenario.path.startsWith('/api/share/') || scenario.path.startsWith('/api/conversations/'))
  : allScenarios;


try {
  const seen = [];
  let github;
  const revokedShares = new Set();
  upstream = http.createServer((req, res) => {
    let body = ""; req.on("data", (d) => (body += d)).on("end", () => {
      seen.push(`${req.method} ${req.url}`);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("x-ratelimit-remaining", "59");
      if (req.url === '/auth/v1/user') {
        if (phase2 && ['Bearer phase2-a', 'Bearer phase2-b'].includes(req.headers.authorization) && req.headers.apikey === 'fixture-public-key') {
          res.end(JSON.stringify({ id: req.headers.authorization.slice(7), identities: [{ provider: 'github', id: '101' }] })); return;
        }
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
      // Collect: a save is stored, a removal removes, and a signed-out read
      // (the public key) finds nothing, as row-level security has it.
      else if (req.url === '/rest/v1/repo_collections' && req.method === 'POST') {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        res.writeHead(201); res.end();
      }
      else if (req.url.startsWith('/rest/v1/repo_collections?') && req.method === 'DELETE') {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        res.writeHead(204); res.end();
      }
      else if (req.url.startsWith('/rest/v1/repo_collections?') && req.headers.authorization === 'Bearer fixture-public-key') res.end('[]');
      else if (req.url.startsWith('/rest/v1/repo_collections?')) {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') {
          res.writeHead(401); res.end('{}'); return;
        }
        res.end(JSON.stringify([{ id: 1, repo_full_name: 'octo/demo', notes: 'probe' }]));
      }
      // Shares: a public one for anyone, a private one only for session-a,
      // as row-level security has it; otherwise no row.
      else if (req.url.startsWith('/rest/v1/shared_conversations?') && req.method === 'PATCH') {
        const params = new URL(req.url, 'http://stand.in').searchParams;
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key' || params.get('created_by') !== 'eq.a' || params.get('deleted_at') !== 'is.null') {
          res.writeHead(401); res.end('{}'); return;
        }
        revokedShares.add(params.get('conversation_id'));
        res.writeHead(204); res.end();
      }
      else if (req.url.startsWith('/rest/v1/shared_conversations?')) {
        const params = new URL(req.url, 'http://stand.in').searchParams;
        const token = params.get('share_token');
        const owner = req.headers.authorization === 'Bearer session-a';
        if (req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        if (params.get('conversation_id') && owner && params.get('created_by') === 'eq.a' && params.get('deleted_at') === 'is.null' && params.get('select') === 'id') {
          res.end(JSON.stringify(revokedShares.has(params.get('conversation_id')) ? [] : [{ id: 's1' }]));
        }
        else if (params.get('conversation_id') === 'eq.c1' && owner) res.end(JSON.stringify({ id: 's1', created_by: 'a', conversation_id: 'c1' }));
        else if (token === 'eq.tok-public') res.end(JSON.stringify({ id: 's1', share_token: 'tok-public', is_public: true, title: 'Shared' }));
        else if (token === 'eq.tok-private' && owner) res.end(JSON.stringify({ id: 's2', share_token: 'tok-private', is_public: false, title: 'Mine' }));
        else { res.writeHead(406); res.end(JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'Cannot coerce the result to a single JSON object' })); }
      }
      // Votes: anyone may read them; a signed-in user may write their own.
      // There is no stats function, as on the live database.
      else if (req.url.startsWith('/rest/v1/rpc/get_repo_vote_stats')) {
        res.writeHead(404); res.end(JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }));
      }
      else if (req.url.startsWith('/rest/v1/repo_votes') && req.method !== 'GET') {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        res.writeHead(req.method === 'DELETE' ? 204 : 201); res.end();
      }
      else if (req.url.startsWith('/rest/v1/repo_votes?')) {
        if (req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        if (req.url.includes('user_id=eq.')) res.end(JSON.stringify({ vote_type: 'upvote' }));
        else res.end(JSON.stringify([{ vote_type: 'upvote' }, { vote_type: 'downvote' }, { vote_type: 'upvote' }]));
      }
      // Ratings: anyone may read them; a signed-in user may write their own.
      else if (req.url.startsWith('/rest/v1/repo_ratings') && req.method !== 'GET') {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        res.writeHead(req.method === 'DELETE' ? 204 : 201); res.end();
      }
      else if (req.url.startsWith('/rest/v1/repo_ratings?')) {
        if (req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        if (req.url.includes('user_id=eq.')) res.end(JSON.stringify({ id: 'r1', user_id: 'a', rating: 4 }));
        else res.end(JSON.stringify([{ id: 'r1', user_id: 'a', rating: 4 }, { id: 'r2', user_id: 'b', rating: 5 }]));
      }
      // Comment votes, and a comment's counts read as one row.
      else if (req.url.startsWith('/rest/v1/comment_votes') && req.method !== 'GET') {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        res.writeHead(req.method === 'DELETE' ? 204 : 201); res.end();
      }
      else if (req.url.startsWith('/rest/v1/comment_votes?')) {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        res.end(JSON.stringify({ vote_type: 'upvote' }));
      }
      // Comments: the list, counts, writes, profiles (refused, as with the
      // missing username column) and the admin lookup (refused).
      else if (req.url.startsWith('/rest/v1/profiles?')) { res.writeHead(400); res.end(JSON.stringify({ code: '42703', message: 'column profiles.username does not exist' })); }
      else if (req.url.startsWith('/auth/v1/admin/users/')) { res.writeHead(403); res.end(JSON.stringify({ code: 403, msg: 'User not allowed' })); }
      else if (req.method === 'HEAD' && req.url.startsWith('/rest/v1/repo_comments?')) { res.setHeader('Content-Range', '0-1/2'); res.end(); }
      else if (req.url.startsWith('/rest/v1/repo_comments') && req.method === 'POST') {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        res.writeHead(201); res.end(JSON.stringify({ id: 'c9', user_id: 'a', comment_text: JSON.parse(body).comment_text }));
      }
      else if (req.url.startsWith('/rest/v1/repo_comments') && req.method === 'PATCH') {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        if (req.url.includes('select=')) res.end(JSON.stringify({ id: 'c1', user_id: 'a', comment_text: 'Edited', is_edited: true }));
        else { res.writeHead(204); res.end(); }
      }
      else if (req.url.startsWith('/rest/v1/repo_comments?select=*&repo_full_name=')) {
        res.end(JSON.stringify([{ id: 'c1', user_id: '0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b', comment_text: 'Great' }]));
      }
      else if (req.url.startsWith('/rest/v1/repo_comments?select=upvotes')) {
        res.end(JSON.stringify({ upvotes: 3, downvotes: 1 }));
      }
      // Videos: the list, a new video (its thumbnail echoed back) and a
      // deletion. Uploader lookups are refused as for comments.
      else if (req.url.startsWith('/rest/v1/repo_videos') && req.method === 'POST') {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        const row = JSON.parse(body);
        res.writeHead(201); res.end(JSON.stringify({ id: 'v9', video_type: row.video_type, thumbnail_url: row.thumbnail_url, uploaded_by: row.uploaded_by }));
      }
      else if (req.url.startsWith('/rest/v1/repo_videos') && req.method === 'DELETE') {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        res.writeHead(204); res.end();
      }
      else if (req.url.startsWith('/rest/v1/repo_videos?select=*&repo_full_name=')) {
        res.end(JSON.stringify([{ id: 'v1', uploaded_by: '0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b', video_url: 'https://youtu.be/dQw4w9WgXcQ' }, { id: 'v2', uploaded_by: null }]));
      }
      // Conversation shares: the caller's own conversation, the share
      // function, and a fork's new conversation.
      else if (req.url.startsWith('/rest/v1/user_conversations?select=id%2Cuser_id')) {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        res.end(JSON.stringify({ id: 'c1', user_id: 'a', title: 'Mine', messages: [{ role: 'user', content: 'hi' }] }));
      }
      else if (req.url.startsWith('/rest/v1/rpc/upsert_shared_conversation')) {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        res.end(JSON.stringify({ id: 's1', share_token: 'tok-new', is_public: JSON.parse(body).p_is_public }));
      }
      else if (req.url.startsWith('/rest/v1/user_conversations?select=id') && req.method === 'POST') {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        res.writeHead(201); res.end(JSON.stringify({ id: 'c9' }));
      }
      else if (req.url.startsWith('/storage/v1/object/avatars/')) {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key' || body !== 'PNG' || req.headers['x-upsert'] !== 'true') {
          res.writeHead(403); res.end(JSON.stringify({ message: 'invalid avatar upload' })); return;
        }
        res.end(JSON.stringify({ Key: 'avatars/photo.png' }));
      }
      else if (req.url === '/storage/v1/object/list/avatars') {
        if (req.headers.authorization !== 'Bearer session-a') { res.writeHead(401); res.end('{}'); return; }
        res.end('[]');
      }
      // Search history: the caller's own rows, with the caller's session.
      else if (req.url.startsWith('/rest/v1/search_history')) {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        if (req.method === 'POST') { res.writeHead(201); res.end(JSON.stringify({ id: 'h9', user_id: 'a', ...JSON.parse(body) })); }
        else if (req.method === 'DELETE') { res.writeHead(204); res.end(); }
        else res.end(JSON.stringify([{ id: 'h1', user_id: 'a', query: 'rust', source: 'search' }, { id: 'h2', user_id: 'a', query: 'go', source: 'chat' }]));
      }
      // Onboarding: the caller's own row, with the caller's session.
      else if (req.url.startsWith('/rest/v1/onboarding_data')) {
        if (req.headers.authorization !== 'Bearer session-a' || req.headers.apikey !== 'fixture-public-key') { res.writeHead(401); res.end('{}'); return; }
        const row = { id: 'o1', user_id: 'a', current_step: 1, completed: false, skipped: false };
        if (req.method === 'POST') { res.writeHead(201); res.end(JSON.stringify(row)); }
        else if (req.method === 'PATCH') res.end(JSON.stringify({ ...row, ...JSON.parse(body) }));
        else res.end(JSON.stringify(row));
      }
      else if (req.url === '/user') {
        const id = { 'Bearer fixture-user': 101, 'Bearer fixture-other': 102 }[req.headers.authorization];
        if (!id) { res.writeHead(401); res.end('{}'); return; }
        res.end(JSON.stringify({ id }));
      }
      else if (req.url === '/models') {
        const messages = JSON.parse(body).messages;
        const suggestions = messages[0]?.content === 'You are a helpful GitHub search assistant that completes user queries.';
        const content = phase2 && suggestions ? JSON.stringify(['fixture completion']) : 'Hello!';
        res.end(JSON.stringify({ choices: [{ message: { content } }] }));
      }
      else if (phase2 && req.url === '/openai') {
        if (req.headers.authorization !== 'Bearer phase2-fixture-key') { res.writeHead(401); res.end('{}'); return; }
        res.end(JSON.stringify({ choices: [{ message: { content: 'enhanced by fixture' } }] }));
      }
      else if (req.url.startsWith("/search/")) res.end(JSON.stringify({ total_count: 0, items: [] }));
      else if (req.url.endsWith("/languages")) res.end('{"Go":42}');
      else if (req.url.endsWith("/readme")) res.end("# Demo");
      else if (req.url.includes("/contents/")) res.end("[]");
      // full_name repeats the path that was asked for, so a reply served from
      // the Go cache still shows which repository the request reached.
      else res.end(JSON.stringify({ id: 42, name: "demo", full_name: req.url.slice("/repos/".length), owner: { login: "octo" }, html_url: "https://github.com/octo/demo", languages_url: `${github}/repos/octo/demo/languages` }));
    });
  });
  upstream.listen(0, "127.0.0.1"); await once(upstream, "listening");
  github = `http://127.0.0.1:${upstream.address().port}`;

  const goPort = await freePort(), nextPort = await freePort();
  const go = start(executable, [], { SEFGH_API_ADDR: `127.0.0.1:${goPort}`, GITHUB_API_URL: github, GITHUB_TOKEN: "fixture-token", NEXT_PUBLIC_SUPABASE_URL: github, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-public-key',
    // Never let a real key from the surrounding shell reach a real provider:
    // the keys are emptied and every provider address points at the stand-in.
    OPENAI_API_KEY: phase2 ? 'phase2-fixture-key' : '', ANTHROPIC_API_KEY: '', SEFGH_AI_MODELS_URL: `${github}/models`, SEFGH_OPENAI_URL: `${github}/openai`, SEFGH_ANTHROPIC_URL: `${github}/anthropic`,
    // The public read token's rules have their own contract; here it is off.
    GITHUB_PUBLIC_READ_TOKEN: '',
    // The start of a conversation's share link, so it does not depend on
    // which host each path shows the Go server.
    NEXT_PUBLIC_SITE_URL: 'https://probe.test' });
  await ready(`http://127.0.0.1:${goPort}/healthz`, go);
  // Retired P7-02/P7-03 routes deliberately have no opt-in names here.
  const routes = "ai-suggestions,ai-enhance-query,ai-chat,activity,repo-starred,repo-collect,repo-vote,repo-rating,comment-vote,repo-comments,repo-videos,upload-avatar,trending-topics";
  const nextEnv = {
    SEFGH_GO_API_URL: `http://127.0.0.1:${goPort}`, SEFGH_GO_ROUTES: routes, NEXT_PUBLIC_SEFGH_GO_DATA: 'search-history,onboarding,home,conversations,user-stats', GITHUB_TOKEN: "", GITHUB_PUBLIC_READ_TOKEN: "",
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
  // Legacy key creation stays in Next. Check the live privacy fix through the
  // actual server, with no session and placeholder Supabase settings only.
  const legacyKeyPrivacy = await raw(nextPort, '/api/playground/keys', {}, JSON.stringify({ name: 'synthetic-privacy-probe' }), 'POST');
  if (legacyKeyPrivacy.status !== 401 || legacyKeyPrivacy.cache !== 'no-store' || legacyKeyPrivacy.backend !== null) {
    throw new Error(`legacy key privacy probe failed: status=${legacyKeyPrivacy.status}, cache=${legacyKeyPrivacy.cache}, backend=${legacyKeyPrivacy.backend}`);
  }
  console.log('Legacy key privacy: anonymous 401/no-store, Next.js route retained');
  console.log("servers ready; probing", scenarios.length, "requests\n");

  // Summary answers are cached by the Go server, so a second identical
  // request makes no upstream call. Count only what each request triggers.
  const ask = async (port, path, headers, body, method) => {
    const before = seen.length;
    const answer = await raw(port, path, headers, body, method);
    let upstream = seen.slice(before);
    if (path === '/api/upload-avatar') {
      // Separate requests deliberately use separate clocks. Contract tests
      // pin the exact timestamp; here compare transport behavior without it.
      const normalize = value => value.replace(/avatar-\d+/g, 'avatar-CLOCK').replace(/\?t=\d+/g, '?t=CLOCK');
      answer.body = normalize(answer.body);
      upstream = upstream.map(normalize);
    }
    if (path === '/api/trending/topics') {
      // generatedAt is each request's own clock, and the six searches run at
      // the same time, so their order differs between requests. The contract
      // test pins both; here compare the rest.
      answer.body = answer.body.replace(/"generatedAt":"[^"]*"/, '"generatedAt":"CLOCK"');
      upstream = [...upstream].sort();
    }
    return { ...answer, upstream };
  };

  let same = 0;
  const different = [];
  for (const { path, headers, status, body, method, cache = 'private, no-store' } of scenarios) {
    // Via Next first, then direct. On the cached summary route the second
    // request makes no upstream call, so those are compared on the reply
    // only; the reply carries the upstream path in full_name. A verified
    // session is remembered in Go memory for 60s (BUG-031, R-042), so the
    // second request may not re-verify with Supabase.
    const viaNext = await ask(nextPort, path, headers, body, method);
    const direct = await ask(goPort, path, headers, body, method);
    const cached = !headers && path.startsWith("/api/github/repo?");
    const stripAuth = u => u.filter(x => x !== 'GET /auth/v1/user');
    const equal = viaNext.status === direct.status && viaNext.body === direct.body && viaNext.backend === "go" &&
      (!headers || (viaNext.status === status && viaNext.cache === cache)) &&
      (cached || JSON.stringify(stripAuth(viaNext.upstream)) === JSON.stringify(stripAuth(direct.upstream)));
    if (equal) same++;
    else different.push({ path, viaNext, direct });
    if (process.env.PROBE_SHOW) console.log(`${equal ? "same" : "DIFF"} ${String(viaNext.status).padEnd(4)}${path.padEnd(62)} -> ${viaNext.upstream.join(" , ").slice(0, 110) || "(no upstream call)"}`);
  }
  console.log(`identical through Next.js and direct: ${same} of ${scenarios.length}`);
  if (different.length > 0) process.exitCode = 1;
  if (phase2 && different.length === 0) {
    const acceptance = await checkPhase2({ base: `http://127.0.0.1:${nextPort}`, seen });
    console.log(`Phase 2 acceptance: ${acceptance.requests} stateful requests, ${acceptance.checks.length} gate checks passed`);
    for (const check of acceptance.checks) console.log(`  ok ${check}`);
  }
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
