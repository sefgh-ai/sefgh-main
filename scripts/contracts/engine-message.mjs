// Compares a handler's answer with a contract case. For a case marked
// `engine_message`, the error's text comes from the JavaScript engine (a
// JSON parse error) and differs between Node versions, so only its being
// text is compared; everything else must be equal.
import assert from 'node:assert/strict';

export function sameAnswer(answer, c) {
  if (!c.engine_message) {
    assert.deepEqual(answer, c.expect);
    return;
  }
  assert.equal(typeof answer.body?.error, 'string', c.id);
  assert.ok(answer.body.error.length > 0, c.id);
  assert.deepEqual({ ...answer, body: { ...answer.body, error: '' } }, { ...c.expect, body: { ...c.expect.body, error: '' } });
}
