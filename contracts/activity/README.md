# Activity contract

**Version 1** (ACT-001, 2026-10-14): 12 cases, 2 marked `defect`, plus an integrity check and a time-zone check. `GET /api/activity` answers the signed-in user's activity over the last year, as a grid of weeks and some statistics. The profile page's usage card reads it (BUG-003).

```text
node --test scripts/contracts/activity.test.mjs
npm run test:contracts
```

This is the first Phase 3 route to be recorded: it reads user data from the database. It is step 1 of "How a route moves" in `docs/adr/0002-go-backend.md`. There is no Go port yet. Phase 3 waits for the database definitions (the `activity_logs` table and its row-level security), which are not in this repository; a port would send the user's own token to the Supabase Data API so the same security applies.

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
