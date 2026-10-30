# GitHub repository read contracts

Version **6** (BUG-047, R-030, 2026-10-30): 148 cases. Repository replies need
a positive whole-number ID, nonempty name/full_name/html_url and an owner with
a nonempty login. Unusable JSON or core shapes return a fixed502. Known malformed
counts, description/language/homepage, licence and topics are omitted or filtered;
legitimate nullable description/language/licence values remain. Details require
a nonempty languages URL; a successful languages reply must be an object, whose
values are nonnegative whole counts (bad entries omitted). Contents is a file,
symlink, submodule or directory list; invalid directory entries are omitted,
and invalid top-level shapes return502. File content/encoding must be strings;
symlinks need a target and submodules need their Git URL. Empty valid lists/maps
remain valid. This is a minimum consumer-shape check, not the entire GitHub schema.

Sixteen prior cases revised, twelve added,120prior cases unchanged. Original
Next.js inputs/answers remain; optional `go_calls` stops Go at an early shape
failure without deleting the later calls made by Next.js. Both Go transports
check only their selected calls. Real unchanged Next.js handlers pass152checks.
Valid BOM JSON, nullable values, and existing optional HTTP fallbacks remain.

Version **5** (BUG-046, R-029, 2026-10-30): 136 cases. Required primary
repository/contents lookups now return 404 for missing repositories, 429 with
nullable rate metadata and Retry-After for rate limits, and fixed 502 messages
for other HTTP/transport failures. Rate-related 403 means Retry-After or zero
remaining; ordinary 403 is 502. Required languages transport failure is also 502.
Existing optional languages/README HTTP fallbacks and successful malformed-body
handling are unchanged (the latter is R-030). Fifteen prior cases revised,
twelve added, 109 prior cases unchanged. `next_expect` retains the unchanged
Next.js answers, verified by its real handlers. Go memory/socket harnesses pin
Retry-After; no cache, credential, live-provider or deployment change.

AUTH-001 (2026-10-13) introduced contract version **4**. The shared
[access contract](../github-access/README.md) now governs credentials and
private response caching. In fixtures, github_token is a verified per-user
credential, never an environment-token fallback. Anonymous reads use no token.
Prior version notes below are historical.

`cases.json` records the three existing Next.js routes and their Go ports.
The 124 cases run against Next.js with `npm run test:contracts`, and against
Go both in memory and over real local sockets with `go test -count=1 ./...`
inside `backend/`. No test calls live GitHub or uses real credentials.

| Route | Fixture route | Behavior |
|---|---|---|
| `GET /api/github/repo?owner=...&name=...` | `summary` | Selects 20 fields; omits missing fields; keeps explicit nulls; the caller's verified GitHub token, if any; `next.revalidate: 3600` |
| `GET /api/github/repo/:owner/:repo` | `detail` | Fetches repo, its languages URL, then README; full repository JSON; the caller's verified GitHub token, if any; languages HTTP failures become `{}`, README failures become null |
| `GET /api/github/contents/:owner/:repo?path=...` | `contents` | Passes through contents JSON; checks and percent-encodes the path; the caller's verified GitHub token, if any |

Detail and contents return rate-limit header strings or null. All three set
JSON content type and no explicit cache-control or retry-after response header.
Detail and contents preserve their generic 500 for upstream 404/rate limits.

## Input rules (version 3)

Every value that goes into a GitHub URL is checked first. An invalid value
answers 400 and **no request is sent to GitHub**, with or without a token.
The rules exist for safety, not to police GitHub's naming: a value that passes
can name only one path segment. Next.js applies them in
`src/lib/github/repo-identifiers.js` and Go in
`backend/internal/githubrepos/identifiers.go`. Change both with the fixtures.

| Value | Accepted | Otherwise |
|---|---|---|
| Owner | `^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$` | 400 `Invalid repository owner or name` |
| Repository name | `^[A-Za-z0-9._-]{1,100}$`, and not `.` or `..` | 400 `Invalid repository owner or name` |
| Contents `path` | Empty, or parts separated by `/` where no part is empty, `.` or `..`; no backslash; no ASCII control character | 400 `Invalid path parameter` |

On the summary route a missing owner or name is still reported first, as 400
`Owner and name parameters are required`. On the contents route the owner and
name are checked before the path.

Each part of an accepted path is percent-encoded with JavaScript's
`encodeURIComponent` rules and the parts are joined with `/`. A file name may
therefore contain `#`, `?`, `%` or a space and still reach that file. The text
`%2e%2e` is sent as `%252e%252e`: a name, never a step up.

## Fixture fields

- `request`: local path and query; dynamic parameters are decoded by the router.
- `calls`: ordered upstream requests and replies. `url` is the raw Next fetch
  argument. `wire_url` is its normalized URL, recorded with Node's URL
  implementation and no fragment. The Node runner checks every value against
  `new URL(url)` independently. Go must send that URL on the wire, including
  literal `|`/`^` and adjacent percent-encoded slashes in filenames.
- `headers`: exact application request headers, excluding transport-added ones.
  `next` pins Next's fetch options, not an HTTP response header.
- `raw_body_base64`: a stub reply given as base64, for bytes that are not valid
  UTF-8 and so cannot be written as a JSON string. Four README cases use it.
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

- The 18 remaining `defect` cases are of two kinds: an upstream status other
  than 404 collapsing into a generic 500, and a successful reply whose shape is
  not checked. The URL-input defects recorded in versions 1 and 2 are fixed.
- A path with a trailing slash, such as `src/`, is now rejected. It used to be
  sent on. No caller in this checkout sends one.
- Since AUTH-001 no route here sends `GITHUB_TOKEN`. A signed-in caller's
  own GitHub token is used after it is verified; anyone else gets public data
  only, read with the public-only token of QUOTA-001 when one is set. See
  [the access contract](../github-access/README.md) and
  [the public read token contract](../public-read-token/README.md). (This
  line used to say the summary and search routes sent the server token for
  any caller; bug register R-046.)
- Malformed successful JSON shapes may be accepted. Detail trusts GitHub's
  `languages_url`; no token is sent to that URL.
- Rate-limit statuses here still become 500; search has a different contract.
- Go bounds each upstream call to 10 seconds and each reply to 16 MiB.
  Redirects, missing dynamic segments, methods other than GET/HEAD, arbitrary
  URL authorities are outside the fixtures. A README that is not valid UTF-8 is
  covered: each ill-formed sequence becomes one replacement character in both
  implementations. Go bounds the whole detail route to 25 seconds.

## Versions

| Version | Decision |
|---|---|
| 1 | Characterized existing handlers, including exposed Node-specific internal errors. Recorded during GO-002a; not released separately |
| 2 | Owner approved stable internal-failure text on 2026-10-12: summary returns 500 `Failed to fetch repository` for transport, parse and internal errors. Its 400, 404 and upstream-status responses remain unchanged. Next.js and Go changed together; search contract stays at version 2 |
| 3 | Owner approved input validation on 2026-10-12 (REVIEW-002 finding 1), applied in `FIX-003`. Owner, name and contents path are checked before any request; contents paths are percent-encoded part by part. 22 existing cases changed: 4 summary names with a space, `#`, `?` or `/` now answer 400; a name with two dots inside is accepted; `#`, `?` and `%` in a file name are encoded; a `.` part, a line break and the disguised `..` no longer change the URL. 37 cases were added. 18 `defect` cases remain, none about URL input |

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

## Optional forwarding probe

The fixtures call each handler directly. They cannot show whether the Next.js
rewrite passes a request to Go unchanged. This does, for all six routes that
have a Go port:

```text
node scripts/contracts/go-forwarding-probe.mjs <path-to-api-executable>
```

It sends 46 awkward public paths and three authenticated requests through Next
and directly to Go. Add `--production` to build and test `next start` in the
ignored `.next-forwarding-probe/` directory. Default mode remains `next dev`.
The fake identity services verify bearer forwarding and mismatch rejection.
A Vercel preview still requires its own routing check. See coordination.md
for actual checks. No production environment values or route switches are changed.
