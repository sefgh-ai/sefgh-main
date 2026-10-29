// Runs the real GET /api/activity handler with the clock, the server's time
// zone and the Supabase client replaced, and records the database query it
// builds. Every replaced global is restored. No Supabase project is contacted.
//
// A fixture gives:
//   now, timezone        the moment and the server's TZ
//   user                 what auth.getUser() answers: an object, null for no
//                        session, or { "error": "..." }
//   client_throws        true when building the client fails
//   rows                 what the activity_logs query returns
//   query_error          a database error message instead of rows
//
// The reply's grid is written compactly, losslessly: each day becomes
// [date, count, color, weekIndex, dayOfWeekIndex].
export async function runActivityFixture(GET, fixture) {
  const original = { Date: globalThis.Date, error: console.error, tz: process.env.TZ, client: globalThis.__activityClient };
  const query = [];
  try {
    process.env.TZ = fixture.timezone;
    const OriginalDate = original.Date;
    globalThis.Date = class extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : [fixture.now])); }
      static now() { return new OriginalDate(fixture.now).getTime(); }
    };
    console.error = () => {};
    globalThis.__activityClient = () => {
      if (fixture.client_throws) throw new Error('no client');
      return {
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
            gte: (...args) => (query.push(['gte', ...args]), builder),
            lte: (...args) => (query.push(['lte', ...args]), builder),
            order: (...args) => (query.push(['order', ...args]), builder),
            then: (resolve) => resolve(fixture.query_error
              ? { data: null, error: { message: fixture.query_error } }
              : { data: Array.isArray(fixture.rows) && fixture.row_limit
                ? fixture.rows.slice(0, fixture.row_limit) : fixture.rows ?? [], error: null }),
          };
          return builder;
        },
      };
    };
    const response = await GET(new Request('https://app.test/api/activity'));
    const body = await response.json();
    if (Array.isArray(body.grid)) {
      body.grid = body.grid.map((week) => week.map((d) => [d.date, d.count, d.color, d.weekIndex, d.dayOfWeekIndex]));
    }
    return {
      status: response.status,
      body,
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      query,
    };
  } finally {
    globalThis.Date = original.Date;
    console.error = original.error;
    if (original.tz === undefined) delete process.env.TZ; else process.env.TZ = original.tz;
    globalThis.__activityClient = original.client;
  }
}
