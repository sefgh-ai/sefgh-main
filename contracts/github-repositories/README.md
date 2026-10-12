# GitHub repository read contracts

`cases.json` records the three existing Next.js routes and their Go ports.
The 83 cases run against Next.js with `npm run test:contracts`, and against
Go both in memory and over real local sockets with `go test -count=1 ./...`
inside `backend/`. No test calls live GitHub or uses real credentials.

| Route | Fixture route | Behavior |
|---|---|---|
| `GET /api/github/repo?owner=...&name=...` | `summary` | Selects 20 fields; omits missing fields; keeps explicit nulls; optional server bearer token; `next.revalidate: 3600` |
| `GET /api/github/repo/:owner/:repo` | `detail` | Fetches repo, its languages URL, then README; full repository JSON; no token; languages HTTP failures become `{}`, README failures become null |
| `GET /api/github/contents/:owner/:repo?path=...` | `contents` | Passes through contents JSON; rejects any `..`, leading slash, or backslash; no token |

Detail and contents return rate-limit header strings or null. All three set
JSON content type and no explicit cache-control or retry-after response header.
Detail and contents preserve their generic 500 for upstream 404/rate limits.

## Fixture fields

- `request`: local path and query; dynamic parameters are decoded by the router.
- `calls`: ordered upstream requests and replies. `url` is the raw Next fetch
  argument. `wire_url` is its normalized URL, recorded with Node's URL
  implementation and no fragment. The Node runner checks every value against
  `new URL(url)` independently. Go must send that URL on the wire, including
  literal `|`/`^` and adjacent percent-encoded slashes in filenames.
- `headers`: exact application request headers, excluding transport-added ones.
  `next` pins Next's fetch options, not an HTTP response header.
- `body`, `raw_body`, `network_error`: the stub response. Raw text covers parse
  failures, README text and UTF-8 byte-order marks.
- `expect`: exact status and structural JSON, including missing versus null.
- `disposition`: `preserve` or `defect`. A defect awaits an owner decision;
  recording it is not a recommendation to keep it permanently.

The raw socket stub accepts request targets containing a literal invalid `%`.
A Go HTTP server would reject those before routing, hiding the wire bytes.

## Cache evidence and limits

The Node runner checks `next: { revalidate: 3600 }`, not Next's Data Cache.
Installed Next 16.1.1 `patch-fetch.js` shows background refresh on stale dynamic
requests and caching of status-200 replies before JSON parsing.

Go implements one-hour freshness, stale-while-revalidate, stale retention on
refresh failure, combined concurrent misses, and cancellation while waiting.
Current waiters share every completed result, including HTTP and transport
failures; only status 200 is retained for future calls. Surviving waiters retry
if the fetching caller was cancelled. A loader panic becomes a logged error,
releases waiters, and leaves any stale value available for a later refresh.
Background refresh survives caller cancellation and remains bounded by a
10-second deadline. Tests cover exact one-hour expiry, one refresh at a time,
oldest-stored eviction, status-200-only storage and independent fetch deadlines.
Keys use normalized URLs and are scoped to an immutable handler's origin/token.
It stores at most 256 entries and 64 MiB of key/header/body bytes, evicting the
oldest stored entry. Heap overhead and in-flight buffers are additional memory.

The Go cache is per process and clears on restart. Next's cache can persist or
be shared depending on deployment. This is a **cutover gate**: choose and verify
production cache/storage behavior and measure outbound requests before enabling
the summary route. Local cache tests are not a production parity claim.

## Open defects and boundaries

- Owner, repository and contents values are interpolated into upstream URLs.
  Reserved characters, percent escapes and dot segments can change the resource
  fetched. Review input validation before public rollout, especially for the
  token-bearing summary route. This port does not approve the old behavior.
- Contents rejects harmless filenames containing `..` but permits encoded
  parent-segment normalization. Both are recorded as defects.
- Malformed successful JSON shapes may be accepted. Detail trusts GitHub's
  `languages_url`; no token is sent to that URL.
- Rate-limit statuses here still become 500; search has a different contract.
- Go bounds each upstream call to 10 seconds and each reply to 16 MiB.
  Redirects, missing dynamic segments, methods other than GET/HEAD, arbitrary
  malformed UTF-8 and all possible URL authorities are outside the fixtures.

## Versions

| Version | Decision |
|---|---|
| 1 | Characterized existing handlers, including exposed Node-specific internal errors. Recorded during GO-002a; not released separately |
| 2 | Owner approved stable internal-failure text on 2026-10-12: summary returns 500 `Failed to fetch repository` for transport, parse and internal errors. Its 400, 404 and upstream-status responses remain unchanged. Next.js and Go changed together; search contract stays at version 2 |

Commit these fixtures and both implementations together. Additional cases
preserving existing behavior do not raise the version.

## Optional smoke test

After an off-switch Next production build and compiling `backend/cmd/api`:

```text
node scripts/contracts/github-repositories-smoke.mjs <absolute-path-to-api-executable>
```

It starts a fake GitHub on localhost, the compiled Go server, Next dev with
the three routes selected, and the off-switch production server. It checks
forwarding, security headers, an unrelated Next route, and retained Next
handlers. It stops only processes it spawned. It does not deploy anything.
