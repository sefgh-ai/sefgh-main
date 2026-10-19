# Trending refresh: options for R-077 (TREND-PLAN-001)

Written by Claude Code on 2026-10-19 for the owner to choose from. Nothing is implemented, and no database change is proposed for application.

**Decision, 2026-10-19: the owner chose option A.** TREND-001a builds the Go endpoint. Building it showed that GitHub refuses the topic searches as written: `OR` applies only to text, not to `topic:` qualifiers, so every search was answered 422 (R-101). The endpoint searches the same words as text, which GitHub matches in a repository's name, description and topics. Results are broader than an exact topic match.

## What exists today

- `POST /api/trending/refresh` needs `CRON_SECRET` as a bearer. It deletes every row of `trending_repos`, then searches GitHub for each of six topics (created in the last 30 days, over 100 stars, top 5) and inserts the results one topic at a time. It uses the browser Supabase client, so it writes with the public key. Since SEC-001 only the service role may write that table, so every write is refused and the table holds 0 rows (R-077). Even with a working write, deleting first and inserting topic by topic is not atomic: a failure part-way leaves the table part-empty.
- Nothing calls it. There is no cron configuration, and the trending page's refresh button stopped calling it when it was protected by `CRON_SECRET`.
- `GET /api/trending/refresh` reports how old the table's newest row is.
- The trending page reads the table from the browser (`src/lib/trending.js`) and merges those topic repositories into the GitHub trending list, which comes from `/api/github/trending` (on Go in production). With 0 rows it adds none. Its freshness check says "stale" whenever there are no rows, so the page always shows "Data is older than 3 days" (R-100).
- The Go service runs as a second Vercel project on the free plan (ADR-0002, hosting option A).
- ADR-0002 puts the refresh in Phase 4, with gates for atomic replacement, idempotency, retries, partial-failure recovery and separate worker privileges. The owner has ruled out the service-role key.

## Options

### A. No stored table: Go serves the topics live, cached by the CDN (recommended)

A new Go endpoint (name provisional, `GET /api/trending/topics`) runs the six topic searches with the public read token, under the rules of QUOTA-001. It answers with a shared cache header (`s-maxage` with `stale-while-revalidate`) so Vercel's CDN serves repeat requests, and GitHub is asked only when the cache misses. The page reads this endpoint instead of the table, and the freshness note uses the answer's own time. The refresh route and the table reads are retired, and the empty table is dropped later with a reviewed migration.

- **For:** nothing writes shared data, so there is no privilege to design, protect or rotate, and nothing to schedule. Standard-library Go, built like the existing GitHub routes. The data is never older than the cache period.
- **Against:** a cache miss costs six GitHub searches, and the search API has a lower rate limit than other GitHub calls. How Vercel's CDN caches this must be verified, which is already a cutover gate. It is a new endpoint with a new contract, not a port: the route count closes by retiring `trending/refresh`, not by porting it.

### B. Keep the table: one database function replaces it atomically, gated by a secret

A `SECURITY DEFINER` function with a fixed search path replaces every row in one transaction (or fills a staging table and swaps it in). It checks a secret, sent in a request header, against a hash kept where the Data API cannot read it. The Go worker endpoint, protected by `CRON_SECRET` as now, fetches GitHub and calls the function once. Vercel Cron (on the free plan at most once a day, by Vercel's documentation; not tried in this project) or a scheduled GitHub Actions workflow runs it.

- **For:** keeps today's design and data model. The write is atomic, needs no service-role key, and the capability can only replace trending rows.
- **Against:** two long-lived secrets to keep and rotate. To be callable through the Data API with the public key, the function must be executable by `anon`, so the secret check is the only gate. That must be reviewed and tested as every role. A scheduler to run and watch. It needs the live definitions of the table and its grants first: the same catalog access KEYS-001 is waiting for.

### C. Keep the table: a least-privilege Postgres role, connected directly

A dedicated login role may only insert into and delete from `trending_repos`. The Go worker connects through Supabase's connection pooler and replaces the rows in one transaction.

- **For:** the database's own privilege system does the gating; there is no function to secure. Atomic.
- **Against:** Go's standard library cannot speak the Postgres protocol, so this needs a third-party driver, which ADR-0002 allows only with a recorded reason. A database password in the Go project's settings. The free plan's pooler and connection limits must be checked. A scheduler, as in B.

### D. Remove the topic sections

Delete the refresh route, the table reads, the freshness note and the merge. The page shows GitHub trending only, which Go already serves. Drop the table later.

- **For:** the least code, and nothing to run or protect.
- **Against:** the topic sections are gone, though they show nothing today.

Not proposed: the service-role key (ruled out), and `pg_cron` with `pg_net` inside the database. That would move the work into SQL, outside the Go migration, and `pg_net` answers asynchronously, which makes an atomic replacement harder.

## Recommendation

**A**, because it removes R-077's cause, a privileged write to shared data, instead of securing it, and adds nothing to run. **D** if the topic sections are not wanted. **B** only if a stored snapshot is needed, for example to keep the list identical for every visitor for a day.

## After the choice

- **A:** TREND-001a, the Go endpoint with its contract, cache header, rate-limit and failure tests, and a lesson, off by default. TREND-001b, the page reads it and R-100 is fixed in React. TREND-001c, a caller audit, then retire the refresh route and propose dropping the table, each after review.
- **D:** one task: remove the route, reads, note and merge, with a caller audit, and fix R-100 by removal.
- **B or C:** obtain the catalog evidence first (`supabase/checks/` style, no row data), prepare the migration, verification and rollback for review without applying them, then build the worker.

R-100 is fixed as part of whichever option is chosen, so it is not fixed twice.
