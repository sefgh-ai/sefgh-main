// Compares the website and the Go service on the public GitHub routes of
// cutover step 1 (docs/cutover.md), from the outside, with no credentials:
//
//   node scripts/compare-deployments.mjs https://<website> https://<go project> [--switched=name,name]
//
// --switched lists the routes the website already forwards to Go (default:
// github-trending). Their answers on the website must carry the Go marker,
// and every other route's must not; after switching a step on, list its
// routes here too. Each path goes to both addresses at the same time.
// Answers that do not depend on GitHub (the languages list and refused
// input) must be the same JSON; a difference only in whitespace, such as the
// newline Go's json.Encoder adds, is noted. Answers from live GitHub can
// change between two calls (GitHub ranks tied search results differently each
// time, and each address spends its own rate limit, which the replies report),
// so for those the status, headers and JSON shape must match and differing
// values are only counted. About ten requests per address reach GitHub;
// signed out, GitHub allows 60 an hour per server address.
// Exits with status 1 if any check fails.
const [website, go] = process.argv.slice(2, 4).map((a) => (a || '').replace(/\/+$/, ''));
if (![website, go].every((a) => /^https?:\/\/[^/]+$/.test(a))) {
  console.error('usage: node scripts/compare-deployments.mjs https://<website> https://<go project> [--switched=name,name]');
  process.exit(2);
}
const switchedArg = process.argv.find((a) => a.startsWith('--switched='));
const switched = new Set((switchedArg ? switchedArg.slice('--switched='.length) : 'github-trending').split(',').filter(Boolean));

// [route name as in SEFGH_GO_ROUTES, path, answer comes from live GitHub]
const paths = [
  ['github-languages', '/api/github/languages', false],
  ['github-search', '/api/github/search', false],
  ['github-search', '/api/github/search?q=react', true],
  ['github-trending', '/api/github/trending?since=daily', true],
  ['github-trending-developers', '/api/github/trending-developers?since=yearly', false],
  ['github-trending-developers', '/api/github/trending-developers?since=daily', true],
  ['github-contributions', '/api/github/contributions', false],
  ['github-contributions', '/api/github/contributions?username=torvalds', true],
  ['github-repo', '/api/github/repo', false],
  ['github-repo', '/api/github/repo?owner=vercel&name=next.js', true],
  ['github-repo-details', '/api/github/repo/-octo/demo', false],
  ['github-repo-details', '/api/github/repo/vercel/next.js', true],
  ['github-contents', '/api/github/contents/octo/demo?path=..', false],
  ['github-contents', '/api/github/contents/vercel/next.js?path=packages', true],
];

async function ask(base, path) {
  const response = await fetch(base + path, { redirect: 'manual' });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return {
    status: response.status, text, json,
    type: (response.headers.get('content-type') || '').split(';')[0],
    cache: response.headers.get('cache-control') || '',
    backend: response.headers.get('x-sefgh-backend') || '',
  };
}

// Key names and value types; an array by its first element.
function shape(value) {
  if (Array.isArray(value)) return value.length ? [shape(value[0])] : [];
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, shape(value[k])]));
  return value === null ? 'null' : typeof value;
}
function leaves(value, at = '', out = {}) {
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) leaves(v, `${at}.${k}`, out);
  else out[at] = value;
  return out;
}

const results = [];
for (const [name, path, live] of paths) {
  const problems = [];
  let note = '';
  try {
    const [site, server] = await Promise.all([ask(website, path), ask(go, path)]);
    if (site.status !== server.status) problems.push(`status ${site.status} vs ${server.status}`);
    if (site.type !== server.type) problems.push(`content-type ${site.type} vs ${server.type}`);
    if (site.cache !== server.cache) problems.push(`cache-control "${site.cache}" vs "${server.cache}"`);
    if (server.backend !== 'go') problems.push('Go reply has no x-sefgh-backend: go');
    if (switched.has(name) && site.backend !== 'go') problems.push('website did not forward it to Go');
    if (!switched.has(name) && site.backend) problems.push(`website forwarded it (x-sefgh-backend: ${site.backend})`);
    if (site.json === undefined || server.json === undefined) problems.push('not JSON');
    else if (!live) {
      if (JSON.stringify(site.json) !== JSON.stringify(server.json)) problems.push('bodies differ');
      else if (site.text !== server.text) note = 'same JSON, whitespace differs';
    } else if (JSON.stringify(shape(site.json)) !== JSON.stringify(shape(server.json))) {
      problems.push('JSON shapes differ');
    } else {
      const a = leaves(site.json), b = leaves(server.json);
      const differing = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k] && !k.startsWith('.rate_limit.')).length;
      note = differing ? `same shape, ${differing} live value(s) differ` : 'identical';
    }
    note = `${site.status}${note ? `, ${note}` : live ? '' : ', identical'}`;
  } catch (error) {
    problems.push(error.cause?.code || error.message);
  }
  results.push({ name: `${path}${switched.has(name) ? ' (switched)' : ''}`, ok: problems.length === 0, detail: problems.join('; ') || note });
}

for (const { name, ok, detail } of results) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\nAll ${results.length} checks passed: ${website} and ${go} agree.`);
process.exitCode = failed ? 1 : 0;
