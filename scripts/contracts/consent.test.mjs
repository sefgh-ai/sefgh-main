// Phase 6 guard (BUG-004, revised in BUG-006): Google Analytics loads for
// everyone who has not opted out, the owner's choice of 2026-10-14 (bug
// register R-055); visitors can opt out and change their answer later (R-062).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

// A stand-in for the browser: an event target as window, and a storage
// that can be told to throw, as a private window does.
function fakeBrowser({ blocked = false } = {}) {
  const store = new Map();
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem: (key) => { if (blocked) throw new Error('blocked'); return store.has(key) ? store.get(key) : null; },
    setItem: (key, value) => { if (blocked) throw new Error('blocked'); store.set(key, String(value)); },
    removeItem: (key) => { if (blocked) throw new Error('blocked'); store.delete(key); },
  };
}

const consent = await import('../../src/lib/consent.js');

test('a choice is stored, announced, and read back', () => {
  fakeBrowser();
  assert.equal(consent.readConsent(), '', 'not answered yet');
  let heard = 0;
  const stop = consent.subscribeConsent(() => heard++);
  consent.saveConsent('accepted');
  assert.equal(consent.readConsent(), 'accepted');
  consent.saveConsent('declined');
  assert.equal(consent.readConsent(), 'declined');
  consent.saveConsent('');
  assert.equal(consent.readConsent(), '', 'clearing the choice asks again');
  stop();
  consent.saveConsent('accepted');
  assert.equal(heard, 3, 'each change is announced, and unsubscribing stops it');
});

test('blocked storage counts as no consent and does not throw', () => {
  fakeBrowser({ blocked: true });
  assert.equal(consent.readConsent(), 'unavailable');
  assert.doesNotThrow(() => consent.saveConsent('accepted'));
});

test('visitors who pressed the old "Got it" are not asked again', () => {
  fakeBrowser();
  localStorage.setItem(consent.CONSENT_KEY, 'accepted');
  assert.equal(consent.CONSENT_KEY, 'sefgh-cookie-consent', 'the key the old bar used');
  assert.equal(consent.readConsent(), 'accepted');
});

test('analytics loads for everyone except those who opt out', () => {
  const layout = read('src/app/layout.js');
  assert.doesNotMatch(layout, /googletagmanager|gtag\(/, 'the layout must not load Google Analytics itself');
  assert.match(layout, /<GoogleAnalytics \/>/);
  const component = read('src/components/GoogleAnalytics.jsx');
  assert.match(component, /const optedOut = consent === "declined";/);
  assert.match(component, /if \(consent === "server" \|\| optedOut\) return null;/);
  // Opting out stops Google Analytics on the current page too.
  assert.match(component, /window\[`ga-disable-\$\{MEASUREMENT_ID\}`\] = optedOut;/);
  const bar = read('src/components/CookieBar.jsx');
  assert.match(bar, /saveConsent\("declined"\)/);
  assert.match(bar, /saveConsent\("accepted"\)/);
});

test('both footers let a visitor change the answer', () => {
  assert.match(read('src/components/CookieBar.jsx'), /onClick=\{\(\) => saveConsent\(""\)\}/);
  for (const footer of ['src/components/ui/footer-newsletter.jsx', 'src/components/Footer.jsx']) {
    assert.match(read(footer), /<CookieSettingsButton /, footer);
  }
});
