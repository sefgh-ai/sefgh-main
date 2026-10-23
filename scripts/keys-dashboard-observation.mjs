// Import and execute only inside cua_repl with its documented Tab handle.
// Never take a full AX/DOM snapshot or screenshot while a private form may exist.
// This projection reads control presence/disabled state, never text or values.
export async function observeKeyForm(tab) {
  let targetVerified = false;
  try {
    const url = new URL(await tab.url());
    targetVerified = url.protocol === 'https:' && url.hostname === 'supabase.com' &&
      url.pathname === '/dashboard/project/mraglhrenqwadegvwxts/settings/jwt';
    if (!targetVerified) return { state: 'wrong-target', target_verified: false };
    const p = tab.playwright;
    const visibleFields = await p.locator('input:visible, textarea:visible, [contenteditable="true"]:visible').count();
    const formOpen = await p.getByRole('heading', { name: 'Create a new Standby Key', exact: true }).count() > 0;
    const submit = p.getByRole('button', { name: 'Create standby key', exact: true });
    const submitPresent = await submit.count() === 1;
    const submitDisabled = submitPresent ? await submit.getAttribute('disabled') !== null : null;
    const pageReady = await p.getByRole('heading', { name: 'JWT Keys', exact: true }).count() === 1 &&
      await p.getByRole('table').count() >= 2;
    return { state: visibleFields > 0 || formOpen || submitPresent ? 'sensitive-form' : pageReady ? 'public-key-page' : 'not-ready',
      target_verified: true, form_open: formOpen, visible_fields_present: visibleFields > 0,
      submit_present: submitPresent, submit_disabled: submitDisabled };
  } catch {
    // A browser error can include the input value. Never return the raw error.
    return { state: 'observation-unavailable', target_verified: targetVerified };
  }
}
