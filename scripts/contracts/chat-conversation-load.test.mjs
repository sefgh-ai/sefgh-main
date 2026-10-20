// The real conversation hook plus the page's real selection effect, with
// deferred database snapshots. This boundary test is not a React renderer.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
register('./chat-conversation-loader.mjs', import.meta.url);
const { useChatConversations } = await import('../../src/hooks/chat/useChatConversations.js');
const page = await readFile(new URL('../../src/app/chat/page.js', import.meta.url), 'utf8');
const wrapperStart = page.indexOf('  const loadConversationWrapper =');
const wrapperEnd = page.indexOf('  // Wrapper for handleNewChat', wrapperStart);
assert.ok(wrapperStart > 0 && wrapperEnd > wrapperStart, 'find actual selection wrapper');
const wrapper = new Function('loadConversation', 'setMessages', 'setSidebarOpen', page.slice(wrapperStart, wrapperEnd) + '\nreturn loadConversationWrapper;');
// Execute the old effect too if it is reintroduced: one selection must not
// perform a second snapshot load after currentConversation changes.
const effectComment = page.indexOf('// Load conversation messages when selected.');
const effectStart = effectComment >= 0 ? page.indexOf('  useEffect(', effectComment) : -1;
const effectEnd = page.indexOf('  // Handle opening code', effectStart);
const selectionEffect = effectStart > 0 && effectEnd > effectStart
  ? new Function('useEffect', 'conversationId', 'loadConversation', 'setMessages', page.slice(effectStart, effectEnd)) : () => {};
const flush = () => new Promise(resolve => setImmediate(resolve));

function mount(initialUser) {
  const cells = [];
  let cursor = 0, pendingEffects = [], user = initialUser, messages = [];
  const requests = [];
  globalThis.__conversationToasts = [];
  globalThis.__deleteConversation = async () => {};
  globalThis.__getConversation = (convId, userId) => new Promise(resolve => requests.push({ convId, userId, resolve }));
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = globalThis.__conversationHooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { current: initial }; return cells[i]; },
    useCallback(callback, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) cells[i] = { callback, deps }; return cells[i].callback; },
    useEffect(effect, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) pendingEffects.push(() => { cells[i]?.cleanup?.(); cells[i] = { deps, cleanup: effect() }; }); },
  };
  const setMessages = value => { messages = value; };
  const HookBoundary = (nextUser = user) => {
    user = nextUser; cursor = 0; pendingEffects = [];
    const chat = useChatConversations(user);
    selectionEffect(hooks.useEffect, chat.currentConversation?.id, chat.loadConversation, setMessages);
    for (const effect of pendingEffects) effect();
    return { ...chat, select: wrapper(chat.loadConversation, setMessages, () => {}) };
  };
  return { render: HookBoundary, requests, setMessages, messages: () => messages };
}

test('same-account metadata changes do not reload and overwrite newer messages', async () => {
  const app = mount({ id: 'a', updated_at: 'before' });
  const selected = app.render().select('c1');
  app.requests[0].resolve({ id: 'c1', messages: ['before'] }); await selected;
  app.render();
  app.render({ id: 'a', updated_at: 'after-avatar-update' });
  app.setMessages(['before', 'newly-sent', 'newly-replied']);
  for (const request of app.requests.slice(1)) request.resolve({ id: 'c1', messages: ['before'] });
  await flush();
  assert.equal(app.requests.length, 1, 'metadata and selection state must not retrigger snapshot load');
  assert.deepEqual(app.messages(), ['before', 'newly-sent', 'newly-replied']);
});

test('missing user never asks the database or reports a property-access error', async () => {
  const app = mount(null);
  assert.equal(await app.render().loadConversation('c1'), null);
  assert.equal(app.requests.length, 0);
  assert.equal(globalThis.__conversationToasts.length, 0);
});

test('a previous direct selection cannot replace the new selection state or messages', async () => {
  const app = mount({ id: 'a' });
  const first = app.render().select('c1'), second = app.render().select('c2');
  app.requests[1].resolve({ id: 'c2', messages: ['second'] }); await second;
  app.requests[0].resolve({ id: 'c1', messages: ['first'] }); await first;
  assert.equal(app.render().currentConversation.id, 'c2');
  assert.deepEqual(app.messages(), ['second']);
  assert.equal(app.requests.length, 2, 'selection must have one snapshot owner');
});

test('a pending direct selection cannot return after clear-all', async () => {
  const app = mount({ id: 'a' });
  const selected = app.render().select('c1');
  assert.equal(await app.render().handleClearAll(), true);
  app.setMessages([]);
  app.requests[0].resolve({ id: 'c1', messages: ['deleted snapshot'] }); await selected;
  assert.equal(app.render().currentConversation, null);
  assert.deepEqual(app.messages(), []);
});

test('an account change invalidates a pending returned snapshot', async () => {
  const app = mount({ id: 'a' });
  const selected = app.render().select('c1');
  app.render({ id: 'b' });
  app.requests[0].resolve({ id: 'c1', messages: ['a only'] }); await selected;
  assert.equal(app.render().currentConversation, null);
  assert.deepEqual(app.messages(), []);
});

test('a delayed delete of the old conversation preserves the new selection', async () => {
  const app = mount({ id: 'a' });
  const first = app.render().select('c1');
  app.requests[0].resolve({ id: 'c1', messages: ['first'] }); await first;
  app.render().setConversations([{ id: 'c1' }, { id: 'c2' }]);
  let finishDelete;
  globalThis.__deleteConversation = () => new Promise(resolve => { finishDelete = resolve; });
  const deleted = app.render().handleDelete('c1');
  const selected = app.render().select('c2');
  app.requests[1].resolve({ id: 'c2', messages: ['second'] }); await selected;
  finishDelete(); await deleted;
  assert.equal(app.render().currentConversation?.id, 'c2');
  assert.deepEqual(app.messages(), ['second']);
  assert.deepEqual(app.render().conversations, [{ id: 'c2' }]);
});
