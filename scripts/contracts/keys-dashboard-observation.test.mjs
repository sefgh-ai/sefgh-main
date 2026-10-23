import test from 'node:test';
import assert from 'node:assert/strict';
import { observeKeyForm } from '../keys-dashboard-observation.mjs';

function browserFixture({ form = true, fields = 1, disabled = true, page = true, tables = 2, url } = {}) {
  const forbidden = () => { throw new Error('PRIVATE_FIXTURE_MUST_NOT_BE_READ'); };
  const locator = count => ({ count: async () => count, getAttribute: async name => {
    assert.equal(name, 'disabled'); return disabled ? '' : null;
  }, allTextContents: forbidden, textContent: forbidden, evaluate: forbidden });
  return {
    url: async () => url ?? 'https://supabase.com/dashboard/project/mraglhrenqwadegvwxts/settings/jwt?method=github',
    getAXState: forbidden, getScreenshot: forbidden, screenshot: forbidden,
    playwright: {
      domSnapshot: forbidden, evaluate: forbidden,
      locator: selector => { assert.equal(selector, 'input:visible, textarea:visible, [contenteditable="true"]:visible'); return locator(fields); },
      getByRole: (role, options) => {
        if (role === 'table') return locator(tables);
        if (role === 'heading' && options.name === 'JWT Keys') return locator(page ? 1 : 0);
        if (role === 'heading' && options.name === 'Create a new Standby Key') return locator(form ? 1 : 0);
        if (role === 'button' && options.name === 'Create standby key') return locator(form ? 1 : 0);
        throw new Error('UNEXPECTED_CONTROL');
      },
    },
  };
}

test('an asynchronous import still containing the private form returns only fixed readiness fields', async () => {
  assert.deepEqual(await observeKeyForm(browserFixture()), {
    state: 'sensitive-form', target_verified: true, form_open: true,
    visible_fields_present: true, submit_present: true, submit_disabled: true,
  });
});

test('unsubmitted private form and unrelated visible inputs both block public-page readiness', async () => {
  assert.equal((await observeKeyForm(browserFixture({ disabled: false }))).state, 'sensitive-form');
  assert.equal((await observeKeyForm(browserFixture({ form: false }))).state, 'sensitive-form');
});

test('closed form requires the real destination heading and key tables', async () => {
  assert.equal((await observeKeyForm(browserFixture({ form: false, fields: 0 }))).state, 'public-key-page');
  assert.equal((await observeKeyForm(browserFixture({ form: false, fields: 0, page: false }))).state, 'not-ready');
  assert.equal((await observeKeyForm(browserFixture({ form: false, fields: 0, tables: 0 }))).state, 'not-ready');
});

test('wrong project, host and protocol are refused before reading the DOM', async () => {
  for (const url of ['https://supabase.com/dashboard/project/kohwfuxqbllsmvmsfqci/settings/jwt',
    'https://supabase.com.example.invalid/dashboard/project/mraglhrenqwadegvwxts/settings/jwt',
    'http://supabase.com/dashboard/project/mraglhrenqwadegvwxts/settings/jwt']) {
    const tab = browserFixture({ url }); tab.playwright = new Proxy({}, { get() { throw new Error('DOM_MUST_NOT_BE_READ'); } });
    assert.deepEqual(await observeKeyForm(tab), { state: 'wrong-target', target_verified: false });
  }
});

test('observation failure cannot forward raw browser errors or secret field values', async () => {
  const tab = browserFixture(); tab.playwright.locator = () => { throw new Error('PRIVATE_FIXTURE_MUST_NOT_BE_READ'); };
  assert.deepEqual(await observeKeyForm(tab), { state: 'observation-unavailable', target_verified: true });
});
