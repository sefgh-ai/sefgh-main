// Checks a deployed Go backend from the outside, with no credentials:
//
//   node scripts/check-go-deployment.mjs https://<go project>.vercel.app
//
// It asks only for things that cost nothing and reveal nothing: the health
// check, the built-in languages list, and requests that must be refused
// without a sign-in. Add --github to also run one search, which spends one
// of GitHub's 60 signed-out requests an hour for the server's address.
// Exits with status 1 if any check fails. See docs/hosting-setup.md.
const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+$/.test(base)) {
  console.error('usage: node scripts/check-go-deployment.mjs https://<go project>.vercel.app [--github]');
  process.exit(2);
}

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

async function ask(path, init = {}) {
  const response = await fetch(base + path, { redirect: 'manual', ...init });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: response.status, headers: response.headers, text, json };
}

// A protected deployment answers with a Vercel sign-in page or a redirect to
// one, never with the Go server's reply.
function looksProtected(reply) {
  const location = reply.headers.get('location') || '';
  return (reply.status >= 300 && reply.status < 400 && /vercel\.com/.test(location)) ||
    (reply.status === 401 && !reply.json);
}

try {
  const health = await ask('/healthz');
  if (looksProtected(health)) {
    console.log(`${base} is protected by Vercel Authentication, so Next.js could not reach it.`);
    console.log('Use the Go project\'s production address (Settings > Domains), which stays public. See docs/hosting-setup.md, step 6.');
    process.exit(1);
  }
  check('health check answers {"status":"ok"}', health.status === 200 && health.json?.status === 'ok', `${health.status} ${health.text.slice(0, 80)}`);
  check('reply is marked X-Sefgh-Backend: go', health.headers.get('x-sefgh-backend') === 'go', health.headers.get('x-sefgh-backend'));
  check('security headers are sent', health.headers.get('x-frame-options') === 'DENY' && !!health.headers.get('content-security-policy'),
    `X-Frame-Options ${health.headers.get('x-frame-options')}`);

  const languages = await ask('/api/github/languages');
  check('languages list (built in, no GitHub call)', languages.status === 200 && languages.json !== null, `${languages.status}, ${languages.text.length} bytes`);

  const activity = await ask('/api/activity');
  if (activity.status === 500 && activity.json?.error === 'Internal server error') {
    check('activity without sign-in is refused', true, '500: the Supabase settings are not set yet, which refuses everyone (fine before step 8)');
  } else {
    check('activity without sign-in is refused', activity.status === 401 && activity.json?.error === 'Unauthorized', `${activity.status} ${activity.text.slice(0, 80)}`);
  }

  const chat = await ask('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"messages":[{"role":"user","content":"hi"}]}' });
  check('chat without sign-in is refused', chat.status === 401, `${chat.status} ${chat.text.slice(0, 80)}`);
  const chatGet = await ask('/api/ai/chat');
  check('chat refuses GET', chatGet.status === 405, String(chatGet.status));

  if (process.argv.includes('--github')) {
    const search = await ask('/api/github/search?q=react&per_page=1');
    check('one search reaches GitHub', search.status === 200 && typeof search.json?.total_count === 'number', `${search.status} ${search.text.slice(0, 80)}`);
  }
} catch (error) {
  check('the address answers at all', false, error.cause?.code || error.message);
}

for (const { name, ok, detail } of results) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\nAll ${results.length} checks passed for ${base}.`);
process.exitCode = failed ? 1 : 0;
