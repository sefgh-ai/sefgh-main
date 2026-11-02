# Browser database calls behind Go (DATA-PLAN-001)

Written by Claude Code on 2026-10-19. This is the plan for the half of Phase 3 that has not started: the database reads and writes the browser makes itself, without an API route. It proposes an order and one design choice for the owner.

**P7-08b (2026-11-03):** the data-proxy areas no longer read the setting either: the browser's and the server's clients always route them through Go, and `NEXT_PUBLIC_SEFGH_GO_DATA` is not read anywhere.

**P7-08a (2026-11-02):** search history and onboarding no longer read the setting: their modules ask only Go and their rewrites are unconditional. The setting now switches only the data-proxy areas, until P7-08b.

**Decision, 2026-10-19: the owner chose option A**, a per-area list in a public build setting. DATA-001 (search history) starts with it.

## What exists

Outside `src/app/api`, 25 browser files use 19 tables and 3 database functions through the Supabase client, in about a hundred places. (`src/app/auth/callback/route.js` also inserts a notification, on the server.) A survey of the source on 2026-10-19 found these, by area:

| Area | Tables and functions | Operations | Main source |
|---|---|---|---|
| Conversations | `user_conversations` | read, insert, update, delete (13 functions, plus 3 for Realtime) | `src/lib/supabase/conversations.js` |
| Search history | `search_history`, `increment_platform_stat` | read, insert, delete, function | `src/lib/supabase/search-history.js` |
| Onboarding | `onboarding_data` | read, insert, update, delete | `src/lib/supabase/onboarding.js` |
| Profile | `profiles` | read, update | `src/lib/supabase/profiles.js`, `src/hooks/profile/useProfileData.js` |
| Notifications | `notifications` | read, insert, update, delete | `src/lib/notifications.js`, `src/contexts/NotificationContext.js`, `src/hooks/notifications/useNotifications.js`, `src/hooks/useSendNotification.js` |
| User stats | `user_stats` | read (insert and update removed 2026-10-28, R-103: the server creates every row) | `src/hooks/useUserStats.js` |
| Activity | `log_user_activity` | function | `src/lib/activity-logger.js` |
| Home | `projects`, `categories` | read; `categories` also insert, update | `src/hooks/home/useProjects.js`, `useCategories.js` |
| Submissions | `repo_submissions` | read, insert, delete | `src/hooks/submissions/useSubmissions.js`, `src/components/SubmitProjectDialog.jsx` |
| Search page | `platform_stats` | read | `src/components/search/SearchStats.jsx` |
| Repository page | `repo_votes`, `repo_ratings`, `repo_comments`, `repo_collections`, `profiles` | read | `src/lib/repo/sefghData.js`, `src/lib/utils/repo/commentHelpers.js` (also calls the Auth admin API, R-040) |
| Playground | `api_keys`, `api_limits`, `api_logs` | read, insert, delete, upsert | `src/components/playground/*Tab.jsx`: part of KEYS-001 (R-039) |
| Trending | `trending_repos` | read, insert, delete | `src/lib/trending.js`, used only by the refresh route since TREND-001b: dead code for Phase 7 |
| Shares | `shared_conversations`, `upsert_shared_conversation` | read, update, function | `src/lib/supabase/shares.js`, imported by nothing: dead code for Phase 7 |

Seven Realtime subscriptions (two for conversations, and one each for the profile, notifications, projects, categories and user stats) also connect straight to Supabase.

## What stays where it is

- **Supabase Auth** in the browser: sign-in, sessions, `auth.updateUser`. The rules keep Auth initially.
- **Realtime subscriptions** in the browser, as the rules keep Realtime initially. A write made through Go reaches the same database, so subscribers are told about it as before; that has to be shown per area (the ADR's "realtime parity" gate).
- **Row-level security** decides as now: Go calls the Data API with the user's own token, never a privileged key, exactly as the ported routes do.

## How one area moves

1. **Characterize** the browser module as it is: run its real functions in Node against the stand-in Supabase (the shared runner's approach), and record what each returns and which Data API requests it makes. That is the area's contract, with `defect` cases as usual.
2. **Port** to Go endpoints with the user's bearer, making the same Data API requests, so row-level security sees the same caller. Add the ADR's Phase 3 tests: two-user isolation (user B cannot reach A's rows through Go), and for conversations atomic writes.
3. **Switch** the browser module: each exported function keeps its signature and calls the Go endpoint (`fetchWithSession`) when the area is switched on, and Supabase directly otherwise. See the decision below.
4. **Lesson, docs, register**, as for every port. The direct path is removed in Phase 7, after cutover and the Phase 6 gate.

## Decision for the owner: how an area is switched

The ported API routes switch with a Next.js rewrite, and rolling back sends traffic to the Next.js handler. Browser calls have no Next.js handler to fall back to, so one of these is needed:

- **A. A per-area list in a public build setting (recommended; chosen).** For example, `NEXT_PUBLIC_SEFGH_GO_DATA=search-history,onboarding`. Each browser module checks its area's name and uses Go or the direct client. Rollback is removing the name and redeploying, as for `SEFGH_GO_ROUTES`. For: one small check per module, no duplicated server code, the direct path stays as the fallback until Phase 7. Against: changing it needs a redeploy, and both paths exist for a while.
- **B. A Next.js route beside each Go endpoint.** The browser always calls `/api/...`, and the existing rewrite switch chooses Next.js or Go. For: the same switch as the routes. Against: every area is written twice, in JavaScript and Go, before the JavaScript is deleted again.

## Proposed order

From least risky to most, each one bounded task (characterize and port, then switch):

1. **Search history** (DATA-001; characterized in DATA-001a, served by Go behind the setting in DATA-001b, off by default): six functions, rows owned by the user, one function call; used on every signed-in search, so it exercises the switch early.
2. **Onboarding** (DATA-002; served by Go behind the setting, off by default; answers each call's `{ data, error }` because the module branches on error codes) and **user stats** (DATA-003): rows owned by the user. User stats lives inside a React hook, and its write rule lets users set their own stats (R-103), which moving it does not fix.
3. **Notifications** (DATA-004): four browser sources; Realtime parity matters.
4. **Profile** (DATA-005): reads and updates; `auth.updateUser` stays in the browser.
5. **Repository page reads** (DATA-006): switch `sefghData.js` and `commentHelpers.js` to the routes Go already serves (vote, rating, collect, comments) instead of new endpoints; R-040 and R-075 come with them.
6. **Home and submissions** (DATA-007): `projects`, `categories`, `repo_submissions`. Who may write `categories` must be checked against its policies first.
7. **Activity** (DATA-008): `log_user_activity` runs with the owner's rights; its use for any user id was closed in SEC-001 (R-072). The Go endpoint passes the verified caller's id.
8. **Conversations** (DATA-009): the largest area, 13 functions, with the atomic-write gate. Probably split in two.

The playground stays with KEYS-001, and `trending_repos` goes in Phase 7.

**Update, 2026-10-19 (DATA-PROXY-001):** to finish in large chunks, the owner chose a Go policy proxy for areas 2 to 8 (user stats, notifications, profile, the repository page's reads, home, submissions, activity, conversations) and the search page's statistics, instead of one endpoint package each. The browser's Supabase client routes those areas' Data API requests through `/api/data/{area}`; Go checks them against `backend/internal/dataproxy/policy.json` and forwards them unchanged. Search history and onboarding keep their own endpoints. Moving an operation's logic into Go later is a change to that operation alone.

**Update, 2026-10-27 (DATA-010):** the repository page's reads are not made in the browser. Its Server Component calls `sefghData.js` (and through it `commentHelpers.js`) with the server client, which the routing fetch did not reach, so the `repo-page` switch did nothing (R-204). The sign-in callback's welcome notification was outside the `notifications` switch the same way. A server client made with `createClient({ goData: true })` now sends the switched areas to the Go server named by `SEFGH_GO_API_URL`, the rewrite's own destination; the repository page and the callback use it. Route handlers keep the unrouted client, as each moves by its own switch. A test lists every server-client user outside `src/app/api` as routed or Auth-only.

## Evidence still needed

Each write area needs its table's current definitions before its writes move, as the rules require. The 2026-10-15 snapshot (`../database/user-db.md`) records every table's read and write rules and the functions' rights, but not column types, constraints, grants or trigger bodies. The catalog query used for KEYS-001 is still refused by the connector. The owner can run a catalog-only query per area in the SQL editor, which reads no row data.
