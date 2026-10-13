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
| `GITHUB_TOKEN` | ignored by migrated handlers | Never grants public callers the owner's private permissions |
| `NEXT_PUBLIC_SUPABASE_URL` | none | Project URL for online identity verification |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | none | Public anon key; no service-role key needed |
| `GITHUB_API_URL` | `https://api.github.com` | GitHub API origin, for pointing at a stub |

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

.github/workflows/backend-verification.yml runs Linux contracts, the race detector,
vet/formatting, lesson solutions and production forwarding. It has read-only
permissions and no deployment credentials. Its presence is not evidence of a
successful hosted run.

## Trending (GO-006b)

Enable only with `SEFGH_GO_ROUTES=github-trending` and the Go origin. Off by
default. Public-only: supplied authorization headers are ignored, and no token
is sent upstream. Thirty-three shared fixtures pin calendar/date/query rules,
responses and injected randomness, including 13 defect cases. The handler has
a 10-second upstream timeout and 16 MiB body limit, and honors cancellation.
It preserves fabricated starsToday and local-time date calculation pending
contract decisions. No private data, database access or shared cache.

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
