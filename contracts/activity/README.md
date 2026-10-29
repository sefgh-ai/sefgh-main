# Activity contract

**Version 3** (BUG-038, 2026-10-29): R-064 is fixed in Go. Reads use `limit=1000`, increasing `offset`, and `order=activity_date.asc,activity_type.asc` until a page is short. One 10-second deadline covers all pages; later-page failures return the fixed database error, never partial totals. There are 16 cases, including 1001 rows, exactly 1000 rows (requiring an empty final page), and a second-page failure. Existing inputs/answers are unchanged; `go_queries` pins each Go page independently of the rollback handler's `expect.query` builder steps. New cases retain the real Next.js handler's capped first-page reply in `next_expect`; `row_limit` simulates the Data API cap in the Node stand-in, and `page_error_offset` makes the Go stand-in fail a later page. The Go harness slices rows by the actual requested limit/offset. Unit tests also cover a shared deadline, canceled paging and malformed later pages. No Next.js handler changed.

**Version 2** (BUG-036, 2026-10-29): 13 cases. New `auth-unreachable`: when Supabase Auth cannot be reached, Go answers 503 `{"error":"Sign-in could not be verified"}` (as chat does), not 401, so the profile card does not say the visitor signed out (R-063). A refused session is still 401. The Next.js handler cannot tell the two apart and answers 401 until it is retired (`next_expect`). The Go fixture marks the outage with `"unreachable": true` on the user, and its stand-in Supabase then answers 503.

**Version 1** (ACT-001, 2026-10-14): 12 cases, 2 marked `defect`, plus an integrity check and a time-zone check. `GET /api/activity` answers the signed-in user's activity over the last year, as a grid of weeks and some statistics. The profile page's usage card reads it (BUG-003).

```text
node --test scripts/contracts/activity.test.mjs
npm run test:contracts
```

This is the first Phase 3 route to be recorded: it reads user data from the database. It is step 1 of "How a route moves" in `docs/adr/0002-go-backend.md`.

**Go port (ACT-002, 2026-10-14):** `backend/internal/activity`, off by default (switch name `activity`). It passes all 12 cases with `go test -count=1 ./...` inside `backend/`, and sends the user's own token to the Supabase Data API, so the same row-level security applies. It is not turned on: Phase 3's gate still waits for the database definitions (the `activity_logs` table and its row-level security), which are not in this repository. Where Go differs outside these cases is listed in `backend/README.md`, "Activity (ACT-002)".

How the Go runner reads a fixture: `user` becomes a bearer that a stand-in Supabase Auth accepts (answering with that user) or refuses; `client_throws` becomes a server without Supabase settings; `rows` and `query_error` are the stand-in Data API's reply (200 with the rows, or 403 with the message). `expect.query`, recorded from supabase-js, is turned into the URL postgrest-js sends for it and compared with the URL Go sent; the runner also checks that the database is asked with the user's own token. `backend/internal/activity/node_test.go` goes further: it runs this handler through `scripts/contracts/activity-run.mjs` on 400 generated inputs and compares every answer with Go's.

## What is replaced and what is real

`scripts/contracts/activity-fixture.mjs` runs the real handler. It replaces the clock, the server's time zone (`TZ`) and the cookie-session Supabase client (through `activity-loader.mjs`), and restores all three. No Supabase project is contacted. The stand-in client answers `auth.getUser()` from the fixture's `user` and the `activity_logs` query from `rows` or `query_error`, and records every step of the query the handler builds, which `expect.query` pins.

The grid is compacted without loss before comparing: each day `{date, count, color, weekIndex, dayOfWeekIndex}` is written `[date, count, color, weekIndex, dayOfWeekIndex]`.

## Recorded behaviour

- No signed-in user, or a session Supabase refuses: 401 `Unauthorized`, and the database is not asked.
- The query reads `activity_date, activity_count` from `activity_logs` for the user's own `user_id` only, from the Monday on or before 365 days ago to today, oldest first.
- Rows on the same date are added up; a null count is 0.
- Every day of the range is in the grid, with zero when there is no row. A day's colour comes from its count. The last week is padded to seven days with days that have no date.
- `currentStreak` counts back from today while days have activity.
- Any failure is 500 with a fixed sentence: `Failed to fetch activity data` for a database error, `Internal server error` otherwise.

## Fixed in ACT-001, before recording

- **R-056.** A failure reply carried the database's or the runtime's own text as `details` (for example `permission denied for table activity_logs`). It now carries only the fixed sentence; the cause goes to the server log.
- **R-057.** The range and each day's weekday were worked out on the server's local calendar, while dates were written in UTC. On a server in India near midnight UTC, the range started a day early and that Sunday was labelled Monday; in New York the labels were off the other way. Everything now uses the UTC calendar. The cases `server-in-india`, `server-in-new-york` and `near-midnight-utc-in-india` pin it, and a test checks that every date's weekday label is right.

Both were checked against the code at `500dbb7` before the fix, through the same harness.

## Recorded defects (still open)

- `no-activity`: the first week runs Monday to Saturday (six days) while every other week runs Sunday to Saturday; and `totalDays` counts the empty days that pad the last week (370 for 367 real days), so `averagePerDay` divides by too many days. This applies to every 200 reply.
- `streak-zero-when-today-is-empty`: with activity yesterday and none yet today, `currentStreak` is 0 all day.

The profile card computes its own statistics from the days, so neither defect shows there today. Fixing them changes this contract; see bug register R-059.
