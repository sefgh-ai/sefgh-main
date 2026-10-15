# Starred repositories contract

**Version 1** (STAR-001, 2026-10-15): 14 cases, none marked `defect`. `GET /api/repo/starred` answers the signed-in user's saved repositories (`repo_collections`), each checked again with GitHub so that only metadata GitHub currently calls public is shown. The starred page (`src/app/starred/page.js`) reads it.

```text
node --test scripts/contracts/repo-starred.test.mjs
npm run test:contracts
cd backend && go test -count=1 ./internal/starred/
```

## How it was recorded

`scripts/contracts/record-repo-starred.mjs` runs the real Next.js handler on each case's inputs and writes its answer into `expect`. The inputs and dispositions are written by hand. `scripts/contracts/starred-fixture.mjs` replaces the cookie-session Supabase client, through the existing `starred-loader.mjs`, and GitHub, through `fetch`. It records the database query the handler builds and every GitHub request. GitHub requests are listed sorted by URL, since up to four run at once.

A fixture gives `user` (what `auth.getUser()` answers), `client_throws`, `rows` or `query_error`, and `github`: GitHub's answer per `owner/repo`. A name not listed answers 404.

## Recorded behaviour

- No session, or one Supabase refuses: 401 `Unauthorized`, and neither the database nor GitHub is asked.
- The query reads every column (`select *`) of the caller's own rows only, newest first.
- A database error: 500 `Failed to fetch starred repositories`, and GitHub is not asked.
- Every row is checked with GitHub; a stored `repo_data` snapshot is never trusted. Six fields (`description`, `stargazers_count`, `forks_count`, `language`, `topics`, `updated_at`) replace it when GitHub says, with an explicit `private: false`, that the repository is public. Otherwise the row's `repo_data` is null. A field GitHub leaves out is left out; a null field stays null.
- GitHub is asked with no credential and refuses redirects. A name that is not exactly `owner/name` with safe characters is never sent. The boundary of each GitHub read is pinned separately by `contracts/public-repository-reads`.
- Rows keep the database's order; the same repository saved twice is asked about twice.
- A success is `Cache-Control: private, no-store`.

## The Go port

`backend/internal/starred`, off by default; the switch is `repo-starred`. It passes these 14 cases and the 15 cases of `public-repository-reads`. It asks the database as the caller with the caller's own token (`internal/supabaserest`) and reads GitHub through the transport signed-out reads use. Row values and GitHub values pass through as written (`jscompat.ObjectFields`), so any column reaches the browser as the database sent it.

Where it differs, outside these cases (see `backend/README.md`, "Starred (STAR-001)"): it reads a Supabase bearer instead of the session cookie, and it bounds all GitHub reads of one request to 14 seconds together. The Next.js handler has no such bound. A row not checked in time gets null metadata, as a failed read does.
