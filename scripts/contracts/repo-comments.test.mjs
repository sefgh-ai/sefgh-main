// GET, POST, PATCH and DELETE /api/repo/comments, contract version 3
// (COMMENTS-001; version 2, R-086; version 3, R-040 and R-075). Where the
// Next.js handler answers differently from Go, a case keeps its answer as
// next_expect until that handler is retired. The real handlers run with a client built by the real
// supabase-js around a stand-in Supabase; see route-db-fixture.mjs. A Go port
// must pass the same cases; GET's requests may come in any order.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';
import { runRouteFixture, SUPABASE_KEY, NOW } from './route-db-fixture.mjs';
register('./route-db-loader.mjs', import.meta.url);
const handlers = await import('../../src/app/api/repo/comments/route.js');
const contract = JSON.parse(await readFile(new URL('../../contracts/repo-comments/cases.json', import.meta.url), 'utf8'));

// Version 2 (R-086) caps a page at 50 comments. Go sends the cap. This
// Next.js handler keeps sending the limit as given until it is retired: the
// owner's rule is to fix a backend bug once, in Go. Everything else must
// still match.
const asSentByNext = (c) => {
  const expect = c.next_expect ?? c.expect;
  const limit = Number.parseInt(new URLSearchParams(c.query ?? '').get('limit'));
  if (!(limit > 50)) return expect;
  return {
    ...expect,
    database: expect.database.map((request) => ({ ...request, path: request.path.replace('&limit=50&', `&limit=${limit}&`) })),
  };
};

test('comments fixture integrity', () => {
  assert.equal(contract.contract_version, 5);
  assert.equal(new Set(contract.cases.map((c) => c.id)).size, contract.cases.length);
  for (const c of contract.cases) {
    assert.ok(['preserve', 'defect'].includes(c.disposition), c.id);
    assert.ok(['GET', 'POST', 'PATCH', 'DELETE'].includes(c.method), c.id);
    assert.ok(c.reason, c.id);
    // R-086: no page is asked for more than 50 comments.
    for (const request of c.expect.database) {
      const limit = request.path.match(/[?&]limit=(\d+)/)?.[1];
      if (limit) assert.ok(Number(limit) <= 50, c.id);
    }
    // R-040, R-075: Go reads the author's public columns and never makes the
    // admin lookup, so no author's email is sent.
    for (const request of c.expect.database) {
      assert.ok(!request.path.startsWith('/auth/v1/admin/'), c.id);
      if (request.path.startsWith('/rest/v1/profiles')) assert.ok(request.path.includes('select=full_name%2Cavatar_url&'), c.id);
    }
    for (const item of c.method === 'GET' && Array.isArray(c.expect.body?.comments) ? c.expect.body.comments : []) {
      if (item && 'user_email' in item) assert.equal(item.user_email, null, c.id);
    }
    // Nothing is asked before sign-in and the input checks.
    if ([400, 401].includes(c.expect.status)) assert.deepEqual(c.expect.database, [], c.id);
    // A failure never carries the database's own words.
    if (c.expect.status >= 400) assert.deepEqual(Object.keys(c.expect.body), ['error'], c.id);
    assert.equal(c.expect.cache_control, null, c.id);
    for (const request of c.expect.database) {
      assert.equal(request.apikey, SUPABASE_KEY, c.id);
      if (request.path.startsWith('/auth/v1/admin/')) {
        // The admin lookup (R-040) goes with the public key, never a user's
        // token, and so is refused.
        assert.equal(request.authorization, `Bearer ${SUPABASE_KEY}`, c.id);
        continue;
      }
      assert.ok(/^\/rest\/v1\/(repo_comments|profiles)\?/.test(request.path), c.id);
      // The visitor's own token, or the public key: never a server credential.
      assert.equal(request.authorization, `Bearer ${c.session ?? SUPABASE_KEY}`, c.id);
      // A write names the signed-in user, and only that user.
      if (request.method === 'POST') assert.equal(request.body.user_id, c.user.id, c.id);
      if (request.method === 'PATCH') {
        assert.ok(request.path.includes(`&user_id=eq.${c.user.id}`), c.id);
        assert.equal(request.body.updated_at, NOW, c.id);
      }
    }
  }
});

for (const c of contract.cases) {
  test(`comments: ${c.id} [${c.disposition}]`, async () => {
    assert.deepEqual(await runRouteFixture(handlers, '/api/repo/comments', c), asSentByNext(c));
  });
}
