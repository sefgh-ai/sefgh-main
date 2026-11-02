# Search history contract

**P7-08a (2026-11-02):** the module's direct database path and this contract's recorder were retired. The module asks only Go, whatever NEXT_PUBLIC_SEFGH_GO_DATA says; a missing Go route is an ordinary failure. `expect.database` stays: it is what Go's own tests require Go to send. The Node test runs every case through Go with the area switched off.

**Version 2** (BUG-032, 2026-10-28): after a successful save Go asks `increment_platform_stat({ key: "total_searches" })` as the user, so the search counter moves (R-102). The four successful saves (`save-search`, `save-chat`, `save-defaults`, `save-without-source`) now carry `go_database` with that call and a stand-in 204 answer, and are `preserve`. The module's direct path is unchanged: it never sends the call, and is used only when Go does not answer, until it is retired. The rule "Go never asks more than the module" now allows exactly this one call after a save.

**Version 1** (DATA-001a and DATA-001b, 2026-10-19): 35 cases, 5 marked `defect`, for the browser module `src/lib/supabase/search-history.js`. It is the first area of the browser's own database calls to move behind Go (`../../docs/plans/browser-data.md`). The search page, the chat and the search history dropdown call it.

```text
node --test scripts/contracts/search-history.test.mjs
```

## How it was recorded

`scripts/contracts/record-search-history.mjs` runs the module's real functions in Node. `scripts/contracts/browser-db-fixture.mjs` gives them the browser's Supabase client, built by the real supabase-js 2.78 around a stand-in Supabase, with the case's session. The module builds its client once, when it loads, so the runner installs the client before the import. Each case records what the call returned (or threw) and every Data API request it made.

## Recorded behaviour

- **`saveSearchHistory(userId, query, source, options)`:** without a user id, or with a query that is only white space, returns `null` and asks nothing. A query that is not text throws (`query?.trim` is not a function). Otherwise it inserts `{ user_id, query (trimmed), source, filters (default {}), results_count (default 0) }` and returns the stored row, or `null` on any failure.
- **Defect (R-102):** the call to `increment_platform_stat` is not awaited, so supabase-js never sends it, and the search page's "total searches" never counts a saved search. No case records that request.
- **`getSearchHistory(userId, { limit = 50, offset = 0, source })`:** without a user id, `[]`. Otherwise the user's rows, newest first, as one page (`offset`, `limit`), optionally of one source; `[]` on any failure or a null reply.
- **`deleteSearchHistoryItem(id)`:** deletes by id, so row-level security limits it to the user's own entries. `true` unless the request fails, even when nothing matched (an id that is missing becomes `eq.undefined`).
- **`clearSearchHistory(userId, source)`:** deletes the user's entries, optionally of one source. The user id is not checked: without one the filter is `user_id=eq.null`, which matches nothing, and the answer is `true`.
- **`getSearchHistoryCount(userId)`:** reads every entry's source and counts `total`, `search` and `chat`; zeros without a user id or on failure.
- Signed out, the browser client sends the public key, and row-level security shows and changes nothing. Another user's id gives the same outcome.
- **`getSearchHistoryCount` on a null reply** throws (`data.length`), so the call rejects (`count-null-reply`, `defect`); through Go it gives zeros.

## Through Go (DATA-001b)

With `search-history` in `NEXT_PUBLIC_SEFGH_GO_DATA`, the module asks `backend/internal/searchhistory`. The recorder also records, for each case, the request the switched module sends (`expect.go_request`). Three test runs pin the chain:

- `search-history.test.mjs` runs every case on the direct path; switched, with Go answering `go_status` and `go_returns` (the module must send `go_request` and give that value, asking nothing directly); and switched with the Go route missing (404), where the module must take its direct path as before.
- Go's `TestContract` replays each `go_request` against the real endpoints and stand-in Supabase. It must make the same Data API requests, or those in `go_database`, and answer the value.

The Go endpoints take the module's user id only as a filter that must equal the verified caller's. `go_database` marks the cases where Go asks nothing: signed out (401) and another user's id. There the module gives the same value as now, except a signed-out `deleteSearchHistoryItem`, which gives `false` instead of a `true` that deleted nothing, and a null count reply, which gives zeros instead of throwing. The argument checks stay in the browser module.
