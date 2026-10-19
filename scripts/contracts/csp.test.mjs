// Phase 6 guard (BUG-010): the content security policy must let the site's
// own features run. In a production build in headless Chrome it blocked
// Supabase Realtime, a websocket that "https:" does not cover (R-104). It
// also refuses the home page's blob: worker (R-054, open), which then runs
// on the main thread. This checks the policy with Chrome's
// matching rules for the few source forms the policy uses: a scheme such as
// "https:" matches that scheme only (http: also https:, ws: also wss:), and
// a host such as "https://*.supabase.co" also needs its scheme. A directive
// the policy leaves out falls back as the browser does: worker-src to
// script-src, and every fetch directive to default-src.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../../next.config.mjs';

async function policy() {
  const [{ source, headers }] = await config.headers();
  assert.equal(source, '/:path*');
  const value = headers.find((h) => h.key === 'Content-Security-Policy')?.value;
  assert.ok(value, 'no Content-Security-Policy header');
  return new Map(value.split(';').map((d) => d.trim().split(/\s+/)).filter(([name]) => name).map(([name, ...sources]) => [name, sources]));
}

const FALLBACK = { 'worker-src': ['script-src', 'default-src'], 'connect-src': ['default-src'], 'script-src': ['default-src'] };

function sourcesFor(directives, name) {
  for (const candidate of [name, ...(FALLBACK[name] ?? [])]) {
    if (directives.has(candidate)) return directives.get(candidate);
  }
  return [];
}

function schemeMatches(allowed, scheme) {
  return allowed === scheme || (allowed === 'http' && scheme === 'https') || (allowed === 'ws' && scheme === 'wss');
}

function allows(sources, url, self) {
  const target = new URL(url);
  const scheme = target.protocol.slice(0, -1);
  return sources.some((source) => {
    // 'self' is the page's own origin, over http(s) or ws(s); never blob:.
    if (source === "'self'") return ['http', 'https', 'ws', 'wss'].includes(scheme) && target.host === new URL(self).host;
    if (/^[a-z][a-z0-9+.-]*:$/.test(source)) return schemeMatches(source.slice(0, -1), scheme);
    const host = source.match(/^([a-z][a-z0-9+.-]*):\/\/(\*\.)?([^/:]+)$/);
    if (!host) return false;
    const [, allowedScheme, wildcard, name] = host;
    if (!schemeMatches(allowedScheme, scheme)) return false;
    return wildcard ? target.hostname.endsWith(`.${name}`) : target.hostname === name;
  });
}

const SELF = 'https://sefgh.example';

test('Supabase Realtime may connect (R-104)', async () => {
  const connect = sourcesFor(await policy(), 'connect-src');
  assert.ok(allows(connect, 'https://abcdefgh.supabase.co/rest/v1/profiles', SELF), 'the Data API');
  assert.ok(allows(connect, 'wss://abcdefgh.supabase.co/realtime/v1/websocket?vsn=1.0.0', SELF), 'Realtime');
  // The checker itself: "https:" alone is what let R-104 through.
  assert.equal(allows(['https:'], 'wss://abcdefgh.supabase.co/realtime/v1/websocket', SELF), false);
});

// troika-three-text (the 3D text) starts a blob: worker and the worker loads
// its code from blob: URLs, which script-src governs. Allowing the worker
// alone was tried in BUG-010: the worker then started and failed, with 36
// errors and an uncaught exception on the home page, where refusing it lets
// troika fall back cleanly. So both are allowed, or neither.
test('blob: workers are allowed only with blob: scripts (R-054)', async () => {
  const directives = await policy();
  const blob = 'blob:https://sefgh.example/0b40979e';
  assert.equal(allows(sourcesFor(directives, 'worker-src'), blob, SELF), allows(sourcesFor(directives, 'script-src'), blob, SELF));
});
