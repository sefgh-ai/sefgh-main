// Phase 6 guard (BUG-004): the Sessions tab shows only what can be known
// (bug register R-049), "Sign out everywhere" ends every session, and the
// ordinary "Sign out" ends only this device's (R-058).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
const { describeUserAgent } = await import('../../src/lib/utils/userAgent.js');

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('this device is described from what the browser reports', () => {
  const cases = [
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', 'computer', 'Windows', 'Chrome 155'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0', 'computer', 'Windows', 'Edge 155'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 OPR/120.0.0.0', 'computer', 'Windows', 'Opera 120'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0', 'computer', 'macOS', 'Firefox 131'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 'computer', 'macOS', 'Safari 18'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'phone', 'iOS', 'Safari 18'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/155.0.0.0 Mobile/15E148 Safari/604.1', 'phone', 'iOS', 'Chrome 155'],
    ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'tablet', 'iPadOS', 'Safari 18'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36', 'phone', 'Android', 'Chrome 155'],
    ['Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', 'tablet', 'Android', 'Chrome 155'],
    ['Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36', 'phone', 'Android', 'Samsung Internet 26'],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0', 'computer', 'Linux', 'Firefox 131'],
    ['', 'computer', 'Unknown system', 'Unknown browser'],
  ];
  for (const [ua, kind, system, browser] of cases) {
    assert.deepEqual(describeUserAgent(ua), { kind, system, browser }, ua || '(empty)');
  }
  assert.deepEqual(describeUserAgent(undefined), { kind: 'computer', system: 'Unknown system', browser: 'Unknown browser' });
});

test('the Sessions tab invents nothing and signs out everywhere', () => {
  const tab = read('src/components/settings/SessionsTab.jsx');
  for (const invented of ['Hyderabad', 'Telangana', '2405:201', 'iPhone 15', 'PLACEHOLDER', 'Terminate']) {
    assert.ok(!tab.includes(invented), `the Sessions tab still contains "${invented}"`);
  }
  assert.match(tab, /signOut\(\{ scope: "global" \}\)/);
});

test('the ordinary sign-out ends only this device\'s session', () => {
  const auth = read('src/contexts/AuthContext.js');
  assert.match(auth, /const signOut = useCallback\(async \(\{ scope = "local" \} = \{\}\) =>/);
  assert.match(auth, /supabase\.auth\.signOut\(\{ scope \}\)/);
  assert.doesNotMatch(auth, /supabase\.auth\.signOut\(\)/, 'Supabase\'s own default is "global"');
});
