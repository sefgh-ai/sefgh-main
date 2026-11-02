# Repository vote contract

Update BUG-050 (R-084,2026-10-30): contract v3. Auth outages now return 503 with fixed text Sign-in could not be verified before any database request in collect, vote, rating, comment votes, comment writes and video writes. Refused sessions retain their existing policy. Rollback Next.js answers remain in next_expect.


**Version 2** (BUG-037, 2026-10-29): R-076 is fixed in Go. After a successful write Go reads and counts votes directly, without calling the missing `get_repo_vote_stats`. All 37 cases remain: 15 have `go_database` replies and Go request expectations without the RPC, while their original inputs and Next.js answers remain in `database` and `next_expect`. The three hypothetical successful-RPC cases now supply rows for Go to count; their old object/list/null RPC answers remain checked against Next.js. Failed counts still return zeros. No Next.js handler changed.

**Version 1** (VOTE-001, 2026-10-17): 37 cases, 5 marked `defect`, over `GET` and `POST /api/repo/vote`. `POST` records an upvote or downvote, or removes the vote; `GET` answers the counts and the visitor's own vote. The vote arrows (`src/components/repo-details/RepoVoteSection.jsx`) call `POST`. Nothing in the browser calls `GET`.

```text
node --test scripts/contracts/repo-vote.test.mjs
npm run test:contracts
cd backend && go test -count=1 ./internal/vote/
```

## How it was recorded

(Historical: the Next.js handlers and this recorder were retired in P7-05, and every `next_*` field was removed from the cases; Go's tests run every case.) `scripts/contracts/record-repo-vote.mjs` ran the real Next.js handlers on each case's inputs and writes their answers into `expect`. The inputs and dispositions are written by hand. `scripts/contracts/route-db-fixture.mjs` builds the handlers' client with the **real** supabase-js 2.78 and replaces only its `fetch` and `auth.getUser()`. So every query, write, function call and reading of a reply is supabase-js's own. It also fixes the clock at `2026-10-17T09:30:00.000Z` while a handler runs, because a vote stores `updated_at`. `route-db-loader.mjs` hands that client to the handlers. Both files are meant for the next routes too.

A fixture gives:

- `method`, and `query` or `body`.
- `session`: the visitor's access token. Next.js sends it from the session cookie, and Go reads it as a bearer.
- `user`: what Supabase Auth says about it.
- `client_throws`.
- `database`: the rollback Next.js handler's Data API replies, in order. Optional `go_database` replaces that list for Go; absent means use `database`, while an empty list means no supplied replies. `next_expect` retains Next.js behavior when Go's `expect` differs.

`expect.database` lists every request: method, path and query exactly as sent, `Prefer`, `Accept`, `Content-Type`, `Authorization`, `apikey`, and the body as JSON.

## Recorded behaviour

- **POST** checks, in order:
  - sign-in: 401 `Unauthorized. Please login to vote.`;
  - the body: 500 when it is not JSON or is `null`;
  - `repoFullName`: 400;
  - the vote type: a truthy `voteType` that is not exactly `"upvote"` or `"downvote"` is 400.

  A truthy `voteType` is upserted as the user (`on_conflict=user_id,repo_full_name`, `Prefer: resolution=merge-duplicates`, `updated_at` from the clock). A falsy one deletes the user's vote. A failed write is 500 `Failed to save vote` or `Failed to remove vote`.
- **In the rollback Next.js handler, the stats function** `get_repo_vote_stats` is called (`POST /rest/v1/rpc/...`); Go version 2 counts directly:
  - **Defect** (R-076): the live database has no such function, so the call fails and the handler counts the votes itself from `repo_votes`.
  - Were the function present, its answer would be the reply's `votes` as it is, list or object, or zeros when it answers nothing.
  - A failed count is ignored, so every number is 0.
- **`userVote`** in the reply is `voteType` as sent: `null` and `""` stay, and a missing `voteType` (undefined) is left out of the JSON.
- **GET** checks `repo` first (400), then reads every vote, with the visitor's token or the public key. A read error is 500 `Failed to fetch votes`. A signed-in visitor's own vote is read as one row; `vote_type || null` is `userVote`. A refused session counts as signed out, but its token still goes to the database, which refuses it: 500.
- **Counting** follows `filter`: a null row throws (500), a reply that is not a list has no `filter()` (500), and only rows whose `vote_type` is exactly `upvote` or `downvote` count.
- No `Cache-Control` is set. Votes are readable by everyone (`database/user-db.md`), so these counts are right, unlike collect's (R-083).

## The Go port

`backend/internal/vote`, off by default; the switch is `repo-vote`. It passes all 37 cases. Writes go with the caller's own token; reads with the bearer or the public key.

Where it differs, outside these cases (see `backend/README.md`, "Vote (VOTE-001)"):

- it reads a bearer, not the session cookie;
- a POST body over 1 MiB is answered as unreadable;
- a vote's database calls share one 24-second budget (`vote.Budget`). A call cut short reads as a failed one. The Next.js handler has no bound.
