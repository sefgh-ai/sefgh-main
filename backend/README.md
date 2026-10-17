# SEFGH Go backend

API routes that have moved out of Next.js. The plan and its rules are in `../docs/adr/0002-go-backend.md`. This file covers running, testing and switching.

It uses only Go's standard library: there are no third-party dependencies.

## Routes

| Route | Package | Contract |
|---|---|---|
| `GET /api/github/search` | `internal/githubsearch` | `../contracts/github-search/` |
| `GET /api/github/trending-developers` | `internal/githubdevelopers` | `../contracts/github-trending-developers/` |
| `GET /api/github/trending` | `internal/githubtrending` | `../contracts/github-trending/` |
| `GET /api/github/languages` | `internal/githublanguages` | `../contracts/github-languages/` |
| `GET /api/github/contributions` | `internal/githubcontributions` | `../contracts/github-contributions/` |
| `GET /api/github/repo` | `internal/githubrepos` | `../contracts/github-repositories/` |
| `GET /api/github/repo/{owner}/{repo}` | `internal/githubrepos` | `../contracts/github-repositories/` |
| `GET /api/github/contents/{owner}/{repo}` | `internal/githubrepos` | `../contracts/github-repositories/` |
| `POST /api/ai/suggestions` | `internal/aisuggestions` | `../contracts/ai-suggestions/` |
| `POST /api/ai/enhance-query` | `internal/aienhance` | `../contracts/ai-enhance-query/` |
| `POST /api/ai/chat` | `internal/aichat` | `../contracts/ai-chat/` |
| `GET /api/activity` | `internal/activity` | `../contracts/activity/` |
| `GET /api/repo/starred` | `internal/starred` | `../contracts/repo-starred/`, `../contracts/public-repository-reads/` |
| `GET /healthz` | `cmd/api` | Answers `{"status":"ok"}` |

Every response carries `X-Sefgh-Backend: go`, plus the same security headers `next.config.mjs` sets.

## Run it

Needs Go 1.27.2 or later, the version named in `go.mod`.

```
cd backend
go run ./cmd/api
```

| Variable | Default | Meaning |
|---|---|---|
| `SEFGH_API_ADDR` | `127.0.0.1:8787` | Address to listen on. Wins over `PORT` |
| `PORT` | none | Set by a hosting platform. When `SEFGH_API_ADDR` is not set, the server listens on this port on every network interface. A value that is not a number from 1 to 65535 stops the server at start-up |
| `GITHUB_TOKEN` | none | The credential for GitHub Models, used by the AI routes only, as in `src/lib/ai/github.js`. It is never sent to a GitHub API route: those get no token for callers without credentials, and a test fails if that changes |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | none | Keys for enhance-query. OpenAI is used when its key is set, otherwise Anthropic, otherwise the built-in word lists and no provider |
| `SEFGH_AI_MODELS_URL`, `SEFGH_OPENAI_URL`, `SEFGH_ANTHROPIC_URL` | the providers' real addresses | For pointing the three AI providers at a stub in tests and in the forwarding probe |
| `NEXT_PUBLIC_SUPABASE_URL` | none | Project URL for online identity verification, for private GitHub reads and for chat. Without it chat answers 503 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | none | Public anon key; no service-role key needed |
| `GITHUB_API_URL` | `https://api.github.com` | GitHub API origin, for pointing at a stub |
| `GITHUB_PUBLIC_READ_TOKEN` | none | Optional token for GitHub reads made for signed-out callers. Used only if GitHub confirms it is a classic token with no scopes; see "Public read token" below |

Go does not read `.env.local`. Set variables in the shell that starts the server.

With neither address variable set, the server is reachable from this machine only. No Go deployment has been verified; `PORT` support is preparation for hosting, described in `../docs/adr/0002-go-backend.md`.

## Test it

```
cd backend
go test -count=1 ./...
go vet ./...
gofmt -l .
```

`gofmt -l .` prints nothing when every file is formatted.

Use `-count=1` after editing fixtures: they live outside this Go module and
cached results must not be used as evidence for changed data. Repository
fixtures run in memory and over sockets. Other tests cover cache freshness,
refresh recovery, coalescing, cancellation, memory bounds, timeouts and body
limits. `go test -race -count=1 ./...` needs cgo and a supported C compiler.

The summary cache shares failures with callers already waiting, but stores
only status-200 replies for later calls. A cancelled leader lets surviving
waiters retry. Loader panic cleanup releases waiters and preserves stale data.
The repository handlers use the server's `slog` logger for upstream failure
stages and HTTP status failures, without logging URLs, tokens or reply bodies.

`internal/githubsearch` runs every case in `../contracts/github-search/cases.json` twice: once in memory, checking the exact upstream URL and headers, and once over real sockets, checking the bytes on the wire. The same file drives `npm run test:contracts` against the Next.js handler. No test contacts GitHub.

## Send traffic to it

Next.js forwards a route here only when both variables are set **when Next.js is built or started in dev**:

```
SEFGH_GO_API_URL=http://127.0.0.1:8787
SEFGH_GO_ROUTES=github-search
```

`SEFGH_GO_ROUTES` is a comma-separated list of route names from `goBackendRoutes` in `../next.config.mjs`. To roll back, remove the route's name, or unset `SEFGH_GO_API_URL`, and rebuild. The Next.js handler stays in place until its route is retired.

The new names are `github-repo`, `github-repo-details`, and `github-contents`.
GO-004 adds `github-languages`, a static embedded catalog with no upstream
calls, credentials or runtime data file. It also stays disabled by default.
GO-005b adds `github-contributions`, which now needs a verified user credential: without it
every valid request answers 500. It works out its date range in the time zone
of the machine it runs on, as the Next.js handler does.
They remain off by default and await peer review and ADR cutover gates. The
summary cache is local to one Go process: one-hour freshness, stale background
refresh, 256 entries and 64 MiB of stored key/header/body bytes. Cache persistence
and sharing need resolution before public rollout. The repository routes check
owner, name and path before any request to GitHub (`internal/githubrepos/identifiers.go`,
contract version 4). See the repository contract README for exact boundaries.

To see which backend answered a request, send a blank query, which is answered with a 400 without contacting GitHub, and read the headers:

```
curl.exe -i "http://localhost:3000/api/github/search?q=%20"
```

A header `x-sefgh-backend: go` means Go answered. Without it, Next.js did. In PowerShell type `curl.exe`; plain `curl` is a different command there.

### On Vercel (OPS-002)

The hosted setup is a second Vercel project whose Root Directory is `backend/`, following `../docs/hosting-setup.md`. `vercel.json` here selects Vercel's Go preset, which builds `cmd/api` and starts it with `PORT` set. Files outside `backend/` are not available to that build, and the server needs none. The Next.js project then points `SEFGH_GO_API_URL` at the Go project's production address, because preview addresses sit behind Vercel's sign-in. To check a deployment from outside, with no credentials, run this from the repository root:

```
node scripts/check-go-deployment.mjs https://<go project>.vercel.app
```

The in-memory parts of the server (the summary cache and the AI allowances) belong to one running copy, and Vercel may run several copies at once. Each copy counts and caches on its own.

## Where it differs from the Next.js handler on purpose

- **Timeout.** A call to GitHub is abandoned after 10 seconds and answered as a generic failure. The repository detail route, which makes three calls, is bounded to 25 seconds in total. The Next.js handlers have no timeout.
- **Body limit.** A GitHub reply over 16 MB is treated as a failure.
- **Marker header.** `X-Sefgh-Backend: go`.
- **Other methods.** Anything but GET or HEAD gets Go's standard 405.
- **Contributions only.** A count or total from GitHub that is not a JSON number is passed through as it is; JavaScript would convert it. A GitHub status that cannot carry a body, such as 304, answers 500.

Everything the contract fixtures cover is identical.

## Adding a route

1. Record its contract under `../contracts/` and make it pass against the Next.js handler.
2. Add a package under `internal/` and a contract test like `internal/githubsearch/contract_test.go`.
3. Register it in `cmd/api/main.go` and add its name to `goBackendRoutes` in `../next.config.mjs`.
4. Add or extend a lesson in `../learn-go/` for whatever Go the route introduces.

Use `internal/jscompat` to read query strings and to percent-encode. Go's `net/url` parses and encodes differently from the JavaScript the contracts were recorded from.

## API access and CI (AUTH-001 / CI-001)

The five dynamic GitHub routes verify private requests with Supabase and GitHub
online, including direct requests to Go. Supply a Supabase bearer token and
a matching X-GitHub-Token. Private summaries bypass the shared cache; private
responses carry Cache-Control: private, no-store. Public summaries retain their
cache. See [the access contract](../contracts/github-access/README.md) for errors,
tests and the separate private-UI integration still needed.

`newHandler` in `cmd/api/main.go` builds everything the server serves, and the
tests call that same function, so they check the wiring that runs. Handlers
for callers without credentials are built with no token; `wiring_test.go`
fails if the server's own `GITHUB_TOKEN` ever reaches GitHub.

.github/workflows/backend-verification.yml runs Linux contracts, the race detector,
vet/formatting, lesson solutions and production forwarding. It has read-only
permissions and no deployment credentials. Its presence is not evidence of a
successful hosted run.

## Trending (GO-006b)

Enable only with `SEFGH_GO_ROUTES=github-trending` and the Go origin. Off by
default. Public-only: supplied authorization headers are ignored, and no
caller or server token is sent upstream; the public read token of QUOTA-001
may be, when one is set. 44 shared fixtures (contract version 3) pin the
calendar, date and query rules and the replies, including 7 defect cases. The
handler has a 10-second upstream timeout and a 16 MiB body limit, and honors
cancellation. No private data, database access or shared cache.

Version 3 (BUG-007, R-068) fixed the GitHub query here only: the search terms
are separated by spaces. The Next.js handler joined them with `+`, which
GitHub refused, so trending never worked live. Trending is the first route
planned to switch to Go; until then the Next.js handler keeps the old query.

## Developers (GO-007b)

Opt-in name: `github-trending-developers`, off by default. Public-only; no token
is forwarded. Shared v1 fixtures preserve status/body/date/URL behavior and
known defects. Up to 20 enrichments run with four concurrent slots, 10-second
per-call timeout and one 25-second request deadline; replies are capped at 2 MiB
each. Workers are joined before responding and result order follows search order.
These bounds deliberately differ from the unbounded Next Promise.all.

Trending and trending developers read GitHub's replies with `jscompat.DecodeJSON`
and write one log record for a failed request: the stage and the cause, without
the address. Two deliberate differences from the Next.js developers handler are
listed in the ADR and pinned by `TestRecordedDifferencesFromNextJS`.

## AI search helpers (AI-002b)

Opt-in names: `ai-suggestions` and `ai-enhance-query`, off by default. Both
are open to everyone. An address may make 30 AI calls in five minutes across
the two; past that the built-in answers are used and no provider is called.
The count is kept in this process (`internal/ailimit`), so several instances
each count separately. The caller's address is the first entry of
`X-Forwarded-For`, which is only right behind a proxy that sets it.

These routes are served beside the GitHub access check, not behind it. A
request body is limited to 1 MiB, a provider reply to 4 MiB and a provider
call to 25 seconds; the Next.js handlers set none of these. On failure the
log gets the stage and the provider's status, never the query or the
provider's words.

`internal/aiprovider/prompt.go`, `internal/aienhance/prompts.go` and
`internal/aisuggestions/terms.go` are copied from the contracts and from
the Next.js source, so their text is not a retyped copy. The contract cases
compare every provider request in full and fail if either side drifts. There
is no generator script; the files' headers used to name one (bug register
R-047). To change a prompt, change the Next.js source and re-record the
contract, then the Go constant; the contract tests confirm the three agree.

## AI chat (AI-002c)

Opt-in name: `ai-chat`, off by default. Signed-in users only: the request
must carry `Authorization: Bearer <Supabase access token>`, which
`githubaccess.Verifier.SignedInUser` checks online with Supabase Auth. Go
does not read the Next.js session cookie, so the browser sends the bearer
(`../src/lib/ai/chat-request.js`); enable this route only with a frontend
that does. An anonymous Supabase account is refused.

Each user may make 30 requests in five minutes, title requests included, in
an allowance separate from the search helpers'. The count is per process, as
for the helpers. At most the 20 most recent messages and 8,000 characters
are forwarded; older messages are dropped, not refused.

A request body may be up to 4 MiB, because the browser sends the whole
conversation every time. The sign-in check (4 seconds) and one provider call
(25 seconds) fit inside the 30-second write timeout, and a test in `cmd/api`
keeps it so. The fallback title is cut at 30 UTF-16 units as JavaScript cuts
it, which can leave half an emoji; `jscompat.UTF16` writes that half as
JavaScript does.

## Vote (VOTE-001)

Opt-in name: `repo-vote`, off by default. `POST` and `GET /api/repo/vote`: upvoting, downvoting or removing a vote, and the counts. It passes the 37 cases of `contracts/repo-vote`, recorded from the Next.js handlers with the real supabase-js and a fixed clock (`scripts/contracts/route-db-fixture.mjs`).

- **Writes go as the caller:** `supabaserest.Upsert` (new: `on_conflict` and `Prefer: resolution=merge-duplicates`) and `Delete`, with the caller's own token. `updated_at` comes from `Handler.Now`, written by `jscompat.ISOString` as `toISOString()` writes it.
- **The stats function** is called with `supabaserest.RPC` (new). The live database has no `get_repo_vote_stats` (R-076), so the call fails and the votes are counted by hand, as in Next.js. The port keeps the failing call so the two can be compared; the fix comes after cutover.
- **Shared helpers:** `jscompat.RequestFields` (the body read like `const { a, b } = await request.json()`) and `jscompat.TruthyJSON` moved out of collect, which uses them too. `jscompat.Truthy` is the rule `supabaserest.Truthy` now calls.
- **Differs from Next.js:** a bearer instead of the session cookie (the vote arrows now use `fetchWithSession`). A POST body over 1 MiB is answered as unreadable. The write, the stats call and the count share one 24-second budget (`vote.Budget`), because three 10-second calls after sign-in would outlast the 30-second write timeout. `TestHandlersFinishInsideTheWriteTimeout` caught that when the route was wired. A call cut short reads as a failed one.

## Collect (COLLECT-001)

Opt-in name: `repo-collect`, off by default. `POST`, `DELETE` and `GET /api/repo/collect`: saving a repository to the caller's collection, removing it, and asking whether it is saved and how many saves it has. It is the first Go route that writes to the database. It passes the 49 cases of `contracts/repo-collect`, recorded from the Next.js handlers by `scripts/contracts/record-repo-collect.mjs` with the real supabase-js around a stand-in Data API.

- **Writes go as the caller.** `supabaserest.Insert` and `supabaserest.Delete` send the caller's own token with the public key, with the headers postgrest-js sends (`Content-Profile: public`, a JSON `Content-Type`). The row names the user id that Supabase Auth gave for that token, and the table's own rule checks it again: a user may add, change or remove only rows whose `user_id` is their own (`../docs/database/user-db.md`). No service key exists.
- **Reads** go with the caller's bearer, or the public key when signed out. For `GET`, Supabase Auth is asked only for whether the row is the caller's; a token it refuses still goes to the database, as the cookie client sends the session it has.
- **The header** is read by `githubaccess.SessionToken`, now exported, which share uses too. So every route reads a bearer by the same rules.
- **JavaScript's rules kept:** `||` defaults, a repeated name's last value, `String(value)` for a filter (`jscompat.String`), `saves?.length || 0`, and `some()` that throws on a null row.
- **Defects kept** so the two can be compared: the save count reads as the caller and so counts only the caller's own rows (R-083). POST and DELETE answer 401 when Supabase Auth cannot be reached (R-084). Both are fixed here after cutover.
- **Differs from Next.js:** a bearer instead of the session cookie (the three browser callers now use `fetchWithSession`); a POST body over 1 MiB (`collect.MaxBodyBytes`) is answered as unreadable, 500; methods other than GET, HEAD, POST and DELETE get Go's 405. Sign-in, a write and a count take at most 24 seconds together, inside the 30-second write timeout (checked in `cmd/api`).

## Share (SHARE-001)

Opt-in name: `share-token`, off by default. One shared conversation, by the token in its link, for anyone who has the link. It passes the 17 cases of `contracts/share-token`, recorded from the Next.js handler by `scripts/contracts/record-share-token.mjs` with the real supabase-js around a stand-in Data API. The live rules it relies on were read on 2026-10-15 (`../docs/database/user-db.md`).

- **The database** is asked through `internal/supabaserest.SelectObject`, which asks for one row as an object, as `.single()` does. Signed in, the visitor's bearer is sent; signed out, the project's public key, as supabase-js does. Row-level security decides: public shares that are not deleted for anyone, and a user's own shares for that user. Supabase Auth is not asked: the handler needs no user id, and the Data API refuses a token it does not accept.
- **The URL** is the one supabase-js sends, byte for byte. `supabaserest.Param` now encodes with `jscompat.FormEncode` (URLSearchParams), not `url.QueryEscape`; the two differ on `*` and `~`, among others. Activity and starred send the same filters as before, now written as the browser writes them.
- **Defects kept** so the two can be compared: every database failure answers 404 `Not found` (R-082), and missing settings answer 500 with the library's own message (R-081). Both are fixed here after cutover.
- **Differs from Next.js:** a bearer instead of the session cookie (the share page now uses `fetchWithSession`); a header in any other form counts as signed out. Only `GET /api/share/{token}` is served; the fork route under it stays in Next.js.

## Starred (STAR-001)

Opt-in name: `repo-starred`, off by default. The caller's saved repositories, each checked again with GitHub. It passes the 14 cases of `contracts/repo-starred` (recorded from the Next.js handler by `scripts/contracts/record-repo-starred.mjs`) and the 15 of `contracts/public-repository-reads`. Phase 3's database gate for it was met on 2026-10-15: `repo_collections` lets a user read only their own rows (`../docs/database/user-db.md`). Turning it on still waits for review.

- **The database** is asked as the caller with their own bearer, through `internal/supabaserest`, which activity now uses too: `Select` sends the request, `ReadResult` reads the reply as supabase-js does.
- **GitHub** is asked through the transport of signed-out reads: no credential of the caller's, never `GITHUB_TOKEN`, only the public read token when one is set. A name must pass `githubrepos.ValidOwner` and `ValidRepoName` (the same rules, now exported) before it reaches a URL. Redirects are refused, each read has 10 seconds, at most four run at once, and a repository counts as public only with an explicit `private: false`.
- **Values pass through** as written: `jscompat.ObjectFields` reads a row's fields in order with each value's own JSON text, using JavaScript's rule for a repeated name (first place, last value). A column added to the table reaches the browser without a code change, and very large numbers are not rounded.
- **Differs from Next.js:** a Supabase bearer instead of the session cookie (the starred page now uses `fetchWithSession`). All GitHub reads of one request share a 14-second budget; a row not checked in time gets null metadata, as a failed read does. The Next.js handler has no bound. A test in `cmd/api` keeps sign-in, the database and this budget inside the 30-second write timeout. Rows that are not objects are spread as `{...repo}` spreads them; the expected answers were produced by the Next.js handler.

## Activity (ACT-002)

Opt-in name: `activity`, off by default. This is the first route in Go that
reads the database. It answers the caller's own activity over the last year,
as the Next.js handler does, the two recorded defects included (bug
register R-059). Phase 3's database gate for it was met on 2026-10-15:
`activity_logs` lets a user read only their own rows
(`../docs/database/user-db.md`). Turning it on still needs review and the
owner's go-ahead.

The caller sends `Authorization: Bearer <Supabase access token>`, which
`githubaccess.Verifier.User` checks online with Supabase Auth. An anonymous
account counts as a user, as it does for `supabase.auth.getUser()`. The
browser sends the bearer through `../src/lib/supabase/session-fetch.js`.

The database is asked as the caller: one `GET /rest/v1/activity_logs` to
the Supabase Data API with the caller's own token and the project's public
key, the query supabase-js builds for the Next.js handler. No service key is
used, so the table's row-level security decides which rows come back, as
it does now.

Where Go differs, all outside the contract's cases:

- **Cookie.** Next.js reads its session cookie; Go reads the bearer only.
- **Bounds.** The database call is abandoned after 10 seconds and a reply
  over 8 MiB is refused, both answered `Failed to fetch activity data`;
  redirects are not followed. Next.js sets none of these.
- **Odd rows.** A count that is truthy but not a number, which JavaScript
  would add as text, is answered 500 `Internal server error`. A Supabase
  Auth reply whose `id` is not text is refused with 401.
- **Same as Next.js, on purpose.** Supabase Auth being unreachable is 401
  `Unauthorized`, as it is for `getUser()` (bug register R-063). Missing
  Supabase settings are 500 `Internal server error`, the contract's
  `client-fails` case. supabase-js's reading of odd Data API replies, such
  as an empty 404 meaning "no rows", is copied (`readResult`).

`internal/activity/node_test.go` also runs the real Next.js handler, through
`../scripts/contracts/activity-run.mjs`, on 400 generated inputs and compares
every answer. It needs Node and `npm ci`, as CI has; without them it skips.

## Public read token (QUOTA-001)

`GITHUB_PUBLIC_READ_TOKEN` lets signed-out reads of search, repository
summary, detail, contents, trending and trending developers use a server
token instead of sharing GitHub's 60 requests an hour per address. Unset, it
changes nothing.

It must be a classic personal access token with no scopes selected.
`internal/publictoken` asks GitHub (`GET /user`) before using it and uses it
only if the `X-OAuth-Scopes` header comes back empty; any scope, or a
fine-grained token, which sends no such header, is refused. A pass counts for
ten minutes, a refusal for one. A reply that shows scopes or a 401 is thrown
away and the request is sent again without the token. The rules are the
contract in `../contracts/public-read-token/`, which the Next.js side passes
too.

It is an `http.RoundTripper` given only to the clients of the signed-out
handlers in `cmd/api/main.go`; a verified caller's handlers use the default
transport. `cmd/api/publictoken_wiring_test.go` checks every route. Contributions
is not covered: without a caller's token it answers 500 before calling GitHub.
