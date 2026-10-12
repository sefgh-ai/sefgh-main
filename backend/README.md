# SEFGH Go backend

API routes that have moved out of Next.js. The plan and its rules are in `../docs/adr/0002-go-backend.md`. This file covers running, testing and switching.

It uses only Go's standard library: there are no third-party dependencies.

## Routes

| Route | Package | Contract |
|---|---|---|
| `GET /api/github/search` | `internal/githubsearch` | `../contracts/github-search/` |
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
| `SEFGH_API_ADDR` | `127.0.0.1:8787` | Address to listen on |
| `GITHUB_TOKEN` | none | Optional GitHub token. The same variable the Next.js handler reads. Without it GitHub allows about 10 searches a minute |
| `GITHUB_API_URL` | `https://api.github.com` | GitHub API origin, for pointing at a stub |

Go does not read `.env.local`. Set variables in the shell that starts the server.

## Test it

```
cd backend
go test ./...
go vet ./...
gofmt -l .
```

`gofmt -l .` prints nothing when every file is formatted.

`internal/githubsearch` runs every case in `../contracts/github-search/cases.json` twice: once in memory, checking the exact upstream URL and headers, and once over real sockets, checking the bytes on the wire. The same file drives `npm run test:contracts` against the Next.js handler. No test contacts GitHub.

## Send traffic to it

Next.js forwards a route here only when both variables are set **when Next.js is built or started in dev**:

```
SEFGH_GO_API_URL=http://127.0.0.1:8787
SEFGH_GO_ROUTES=github-search
```

`SEFGH_GO_ROUTES` is a comma-separated list of route names from `goBackendRoutes` in `../next.config.mjs`. To roll back, remove the route's name, or unset `SEFGH_GO_API_URL`, and rebuild. The Next.js handler stays in place until its route is retired.

To see which backend answered a request, send a blank query, which is answered with a 400 without contacting GitHub, and read the headers:

```
curl.exe -i "http://localhost:3000/api/github/search?q=%20"
```

A header `x-sefgh-backend: go` means Go answered. Without it, Next.js did. In PowerShell type `curl.exe`; plain `curl` is a different command there.

## Where it differs from the Next.js handler on purpose

- **Timeout.** A call to GitHub is abandoned after 10 seconds and answered as a generic failure. The Next.js handler has no timeout.
- **Body limit.** A GitHub reply over 16 MB is treated as a failure.
- **Marker header.** `X-Sefgh-Backend: go`.
- **Other methods.** Anything but GET or HEAD gets Go's standard 405.

Everything the contract fixtures cover is identical.

## Adding a route

1. Record its contract under `../contracts/` and make it pass against the Next.js handler.
2. Add a package under `internal/` and a contract test like `internal/githubsearch/contract_test.go`.
3. Register it in `cmd/api/main.go` and add its name to `goBackendRoutes` in `../next.config.mjs`.
4. Add or extend a lesson in `../learn-go/` for whatever Go the route introduces.

Use `internal/jscompat` to read query strings and to percent-encode. Go's `net/url` parses and encodes differently from the JavaScript the contracts were recorded from.
