// Runs the real GET /api/repo/starred handler with the Supabase client and
// GitHub replaced, and records the database query it builds and the GitHub
// requests it makes. Every replaced global is restored. Nothing real is
// contacted.
//
// A fixture gives:
//   user           what auth.getUser() answers: an object, null for no
//                  session, or { "error": "..." }
//   client_throws  true when building the client fails
//   rows           what the repo_collections query returns
//   query_error    a database error message instead of rows
//   github         what GitHub answers, by "owner/repo":
//                  { "status": 200, "body": {...} } or { "raw": "text" },
//                  { "network_error": true }, or { "redirect": true }.
//                  A repository not listed answers 404.
//
// The GitHub requests are recorded sorted by URL: the handler starts up to
// four at once, so their order is not part of the contract.
export async function runStarredFixture(GET, fixture) {
  const original = { fetch: globalThis.fetch, error: console.error, client: globalThis.__starredClient, token: process.env.GITHUB_PUBLIC_READ_TOKEN };
  // starred-loader.mjs hands the handler globalThis.__starredClient as it is.
  const query = [];
  const githubCalls = [];
  try {
    delete process.env.GITHUB_PUBLIC_READ_TOKEN;
    console.error = () => {};
    globalThis.fetch = async (input, init = {}) => {
      const url = String(input);
      const headers = Object.fromEntries(new Headers(init.headers).entries());
      githubCalls.push({ url, accept: headers.accept ?? null, user_agent: headers['user-agent'] ?? null, authorization: headers.authorization ?? null, redirect: init.redirect ?? null });
      const name = url.replace('https://api.github.com/repos/', '');
      const answer = fixture.github?.[name];
      if (!answer) return new Response('{"message":"Not Found"}', { status: 404 });
      if (answer.network_error) throw new TypeError('fetch failed');
      if (answer.redirect) throw new TypeError('fetch failed: redirect mode is set to error');
      const body = answer.raw ?? JSON.stringify(answer.body);
      return new Response(body, { status: answer.status ?? 200, headers: { 'content-type': 'application/json' } });
    };
    const client = {
      auth: {
        getUser: async () => {
          if (fixture.user && fixture.user.error) return { data: { user: null }, error: { message: fixture.user.error } };
          return { data: { user: fixture.user ?? null }, error: null };
        },
      },
      from(table) {
        query.push(['from', table]);
        const builder = {
          select: (...args) => (query.push(['select', ...args]), builder),
          eq: (...args) => (query.push(['eq', ...args]), builder),
          order: (...args) => (query.push(['order', ...args]), builder),
          then: (resolve) => resolve(fixture.query_error
            ? { data: null, error: { message: fixture.query_error } }
            : { data: fixture.rows ?? [], error: null }),
        };
        return builder;
      },
  };
    // A client that cannot be built: reading it throws inside createClient().
    if (fixture.client_throws) {
      Object.defineProperty(globalThis, '__starredClient', { configurable: true, get() { throw new Error('no client'); } });
    } else {
      globalThis.__starredClient = client;
    }
    const response = await GET(new Request('https://app.test/api/repo/starred'));
    return {
      status: response.status,
      body: await response.json(),
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      query,
      github: githubCalls.sort((a, b) => a.url.localeCompare(b.url)),
    };
  } finally {
    globalThis.fetch = original.fetch;
    console.error = original.error;
    delete globalThis.__starredClient;
    if (original.client !== undefined) globalThis.__starredClient = original.client;
    if (original.token === undefined) delete process.env.GITHUB_PUBLIC_READ_TOKEN; else process.env.GITHUB_PUBLIC_READ_TOKEN = original.token;
  }
}
