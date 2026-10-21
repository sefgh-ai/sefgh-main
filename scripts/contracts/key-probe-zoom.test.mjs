import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { prepareKeyProbeZoom } from '../key-probe-zoom.mjs';

const destination = 'http://127.0.0.1:5001/playground';
const root = () => ({ style: { zoom: '' } });
function page(href, element, body, fixture = true) {
  return { location: { href }, document: { documentElement: element, body }, window: fixture ? { __keysProbe: {} } : {} };
}

test('zoom waits for the destination document and never modifies about:blank', async () => {
  const blank = root(), ready = root();
  const states = [
    page('about:blank', blank, {}),
    page(destination, null, null),
    page(destination, ready, null),
    page(destination, ready, {}),
  ];
  let calls = 0;
  await prepareKeyProbeZoom(async expression => {
    assert.ok(calls < states.length, 'did not reach ready document');
    const result = runInNewContext(expression, states[calls++]);
    assert.equal(blank.style.zoom, '', 'zoom touched the old document');
    return result;
  }, destination, { timeoutMs: 1000, pollMs: 1 });
  assert.equal(calls, 4);
  assert.equal(ready.style.zoom, '2');
});

test('zoom refuses a different URL or a missing fixture and times out', async () => {
  for (const state of [page(destination + '?other', root(), {}), page(destination, root(), {}, false)]) {
    await assert.rejects(prepareKeyProbeZoom(async expression => runInNewContext(expression, state), destination, { timeoutMs: 30, pollMs: 1 }), /destination document/);
    assert.equal(state.document.documentElement.style.zoom, '');
  }
});

test('an evaluator failure remains a failure', async () => {
  await assert.rejects(prepareKeyProbeZoom(async () => { throw Error('Synthetic CDP failure'); }, destination), /Synthetic CDP failure/);
});
