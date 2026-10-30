import assert from 'node:assert/strict';
import { register } from 'node:module';
import { afterEach, test } from 'node:test';
register('./route-loader.mjs', import.meta.url);
register('./trending-hook-loader.mjs', import.meta.url);
const { useTrendingData } = await import('../../src/hooks/trending/useTrendingData.js');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function mount(fetchImpl, initial = ['repositories', 'any', 'english', 'daily']) {
  globalThis.fetch = fetchImpl;
  globalThis.__trendingToasts = [];
  const cells = [];
  let cursor = 0, pending = [], args = initial, stopped = false, lateWrites = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  globalThis.__trendingHooks = {
    useState(initial) {
      const i = cursor++;
      cells[i] ??= { value: initial };
      return [cells[i].value, value => { if (stopped) lateWrites++; cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }];
    },
    useRef(initial) { const i = cursor++; cells[i] ??= { current: initial }; return cells[i]; },
    useCallback(callback, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) cells[i] = { deps, callback }; return cells[i].callback; },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!same(cells[i]?.deps, deps)) pending.push(() => { cells[i]?.cleanup?.(); cells[i] = { deps, cleanup: effect() }; });
    },
  };
  const HookBoundary = (next = args) => { args = next; cursor = 0; pending = []; const out = useTrendingData(...args); for (const effect of pending) effect(); return out; };
  HookBoundary();
  return { render: HookBoundary, unmount() { stopped = true; for (const c of cells) c?.cleanup?.(); }, lateWrites: () => lateWrites };
}

test('failed refresh has no success toast and loads only the selected list', async () => {
  const asked = [];
  const app = mount(async path => { asked.push(path); return new Response('{}', { status: 502 }); });
  await flush(); asked.length = 0;
  await app.render().handleRefreshTrending();
  assert.deepEqual(globalThis.__trendingToasts.map(([kind]) => kind), ['error']);
  assert.ok(asked.some(path => path.startsWith('/api/github/trending?')));
  assert.ok(!asked.some(path => path.includes('trending-developers')));
  assert.equal(app.render().isRefreshing, false);
  app.unmount();
});

test('an older filter response cannot replace the newest results', async () => {
  const pending = [];
  const app = mount(path => { if (path === '/api/trending/topics') return Promise.resolve(new Response('', { status: 404 })); const d = deferred(); pending.push(d); return d.promise; });
  app.render(['repositories', 'rust', 'english', 'weekly']);
  assert.equal(pending.length, 2);
  pending[1].resolve(Response.json([{ id: 2, name: 'new' }])); await flush();
  assert.equal(app.render().repositories[0].id, 2);
  pending[0].resolve(Response.json([{ id: 1, name: 'old' }])); await flush();
  assert.equal(app.render().repositories[0].id, 2);
  app.unmount();
});

test('a stale failure cannot clear loading or add an error to the new tab', async () => {
  const pending = [];
  const app = mount(path => { if (path === '/api/trending/topics') return Promise.resolve(new Response('', { status: 404 })); const d = deferred(); pending.push(d); return d.promise; });
  app.render(['developers', 'any', 'english', 'daily']);
  pending[0].resolve(new Response('{}', { status: 502 })); await flush();
  assert.equal(app.render().loading, true);
  assert.equal(app.render().loadError, null);
  pending[1].resolve(Response.json([{ id: 3 }])); await flush();
  assert.equal(app.render().developers[0].id, 3);
  assert.equal(app.render().loadError, null);
  app.unmount();
});

test('unmounted list and topic requests do not write state', async () => {
  const pending = [];
  const app = mount(() => { const d = deferred(); pending.push(d); return d.promise; });
  app.unmount();
  for (const d of pending) d.resolve(Response.json([]));
  await flush();
  assert.equal(app.lateWrites(), 0);
});

test('a malformed main list becomes a visible load error', async () => {
  for (const malformed of [{ unexpected: true }, [null], [42], [[]]]) {
    const app = mount(async path => path === '/api/trending/topics' ? new Response('', { status: 404 }) : Response.json(malformed));
    await flush();
    assert.deepEqual(app.render().repositories, []);
    assert.match(app.render().loadError, /could not be loaded/);
    app.unmount();
  }
});

test('a filter change suppresses the old refresh toast while topics are pending', async () => {
  const topics = [];
  const app = mount(path => { if (path !== '/api/trending/topics') return Promise.resolve(Response.json([])); const d = deferred(); topics.push(d); return d.promise; });
  await flush();
  const refreshed = app.render().handleRefreshTrending();
  await flush();
  app.render(['repositories', 'rust', 'english', 'weekly']); await flush();
  assert.equal(app.render().isRefreshing, false, 'superseded refresh spinner must be released');
  for (const d of topics) d.resolve(Response.json({ topics: [] }));
  await refreshed;
  assert.deepEqual(globalThis.__trendingToasts, []);
  app.unmount();
});

test('developer refresh does not request or overwrite repositories', async () => {
  const asked = [];
  const app = mount(async path => { asked.push(path); return path === '/api/trending/topics' ? new Response('', { status: 404 }) : Response.json([{ id: 3 }]); }, ['developers', 'any', 'english', 'daily']);
  await flush(); asked.length = 0;
  await app.render().handleRefreshTrending();
  assert.deepEqual(asked, ['/api/github/trending-developers?since=daily']);
  assert.deepEqual(globalThis.__trendingToasts.map(([kind]) => kind), ['success']);
  app.unmount();
});


test('rate-limit wait time reaches the visible hook error for both lists',async()=>{
 for(const tab of ['repositories','developers']){const app=mount(async path=>path==='/api/trending/topics'?new Response('',{status:404}):Response.json({error:'provider detail',rate_limit:{reset:null}},{status:429,headers:{'Retry-After':'30'}}),[tab,'any','english','daily']);await flush();await flush();assert.match(app.render().loadError,/rate limit/i);assert.match(app.render().loadError,/30 seconds/);app.unmount();}
});
