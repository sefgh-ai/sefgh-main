# GitHub trending characterization (GO-006a)

## Version 8 (BUG-043, R-024, 2026-10-30): current

60 cases. Go returns a colour string from the real table or `#8b949e` for
every unknown name, including `__proto__` and JavaScript's inherited method
names. It no longer emulates prototype lookup. The shared item formatter also
serves Go trending topics. One prior colour case revised, one eleven-name case
added, and the C++ case reclassified as preserved: R-068 already fixed query
encoding. The query decoder and existing Go upstream test pin literal `C++`
inside the language qualifier with spaces between search terms. Actual unchanged
Next.js replies are saved in `next_expect` for both revised and the new case;
the other 57 prior cases are identical. No live GitHub query is claimed here.

## Version 7 (BUG-042, R-023, 2026-10-30)

59 cases. Go reports GitHub 429, or 403 with Retry-After/zero remaining, as
429 with search's fixed error and `rate_limit: {remaining, reset}` (null when
absent). Retry-After is forwarded when supplied. Ordinary 403 stays generic
500; success is not reclassified because of rate headers. One old rate case
revised and five cases added; all other prior cases remain identical. The Go
harness now delivers upstream headers and checks Retry-After. Node's stand-in
captures that header only for cases marked `capture_retry_after`; their old
Next.js replies remain in `next_expect`. The shared helper is
`backend/internal/githublimit/response.go`. No browser message change is implied
(R-205 records that remaining work).

## Version 6 (BUG-041, R-022, 2026-10-30)

Go counts back 1, 7 or 30 elapsed days in UTC for daily, weekly or monthly,
retaining the full timestamp. This fixes month overflow and DST shifts. There
are 54 cases: three existing cutoff URLs changed, and three new empty-result
cases pin a 30-day month and a week across DST in New York and UTC. The real
rollback Next.js replies are recorded in `next_expect` where the cutoff differs.
The remaining prior cases are unchanged. Integrity checks pin each cutoff as
an elapsed duration from its fixed clock. The monthly filter remains a 30-day
window; no yearly option was added to this endpoint.

## Version 5 (BUG-040, R-021, 2026-10-30)

Owner approved pack 2 option A. Go accepts all names in the existing embedded
language catalog, case-insensitively, alongside previously accepted simple
names. Multiword catalog names become one quoted GitHub qualifier; the whole
query stays percent-encoded. The C# case now succeeds in Go; six added cases
cover F#, F*, apostrophes, parentheses, multiword names and lowercase C#.
There are 51 cases; the other 44 existing cases are identical. `next_expect`
records the real rollback Next.js answers for the seven changed/new cases.
An additional Go test sends every catalog name and lowercase variant through
the handler, asserting the exact query GitHub receives. Unknown names containing
spaces, slashes, excessive length or qualifier syntax remain refused.

## Version 4 (BUG-024, 2026-10-28)

Only the GitHub query changed (bug register R-203), with the owner's approval
on 2026-10-28. The `created` qualifier now carries the full UTC time the period
starts at, `created:>2026-10-12T12:00:00Z`, instead of the date alone. GitHub
reads `created:>2026-10-12` as "after that whole day", so "daily" covered only
the hours since midnight UTC and was empty early in the day; weekly and monthly
lost up to a day the same way. The period is still found by local calendar
subtraction in the request's time zone; only the format changed. The 38
expected URLs were rewritten by applying that rule to each case's clock and
time zone, and every new timestamp's date part equals the date version 3
recorded. One case was added, `daily-just-after-midnight-utc` (00:05 UTC: the
search starts at 00:05 the day before). 45 cases.

Go is the implementation of record. The Next.js handler keeps its version 2
query (terms joined with `+`, a date) until it is retired;
`scripts/contracts/github-trending.test.mjs` converts both changes back for it.

## Version 3 (BUG-007, 2026-10-15)

Only the GitHub query changed (bug register R-068), with the owner's approval.
The search terms are now separated by spaces (`stars:>100 created:>DATE
language:X`, sent as `%20`). Version 2 joined them with `+` and then
percent-encoded the query, so GitHub received `%2B`, a literal plus sign, and
refused every request with 422. Trending therefore never worked live. These
fixtures missed it because their stand-in for GitHub answers any URL. The 38
expected URLs were rebuilt from each case's own date and language; a language
such as `C++` is still written `C%2B%2B`.

Go (`backend/internal/githubtrending`) is the implementation of record from
version 3. Under the owner's rule to fix a backend bug once, in Go, the Next.js
handler keeps the version 2 query until trending is switched to Go and the
handler is retired. `scripts/contracts/github-trending.test.mjs` still checks
everything else it does against these cases, with that one stated exception.

## Version 2 (BUG-005, 2026-10-14)

The owner chose on 2026-10-14 to replace the random "stars today" with a real
measure (bug register R-020). The Next.js handler, the Go handler and these
fixtures changed together. 44 cases, 7 marked `defect`.

- `starsToday` is gone. `starsPerDay` takes its place: the repository's
  `stargazers_count` divided by the days since its `created_at`, at least
  one day, rounded down. The search asks only for repositories created inside
  the chosen period, so every one of their stars was earned in that period.
  Days are counted in whole milliseconds, so both implementations round down
  the same value.
- `starsPerDay` is `null` when the count is not a finite number or
  `created_at` is not in the form GitHub sends, `2026-10-12T08:00:00Z`
  (a date alone, or an offset, is not read).
- `heatLevel` comes from `starsPerDay`: 3 from 100 a day, 2 from 25,
  otherwise 1 (including null). It used to be the position in the list.
- Nothing is random. Every case expects `random_calls` 0, and the fixtures
  no longer carry a `random` value.
- Removed: `random-min`, `random-mid`, `random-max`, which pinned the random
  number. `ranking-boundaries`, `fallback-fields` and `unknown-color` are no
  longer defects. Added: 13 cases for the measure and the heat level. Every
  other case is unchanged apart from those two fields.

The rest of this file describes version 1. Where it mentions randomness or
`starsToday`, version 2 above replaces it.

## Version 1

Version 1 pins the existing `GET /api/github/trending` handler at `7e0820c`.
There are 34 cases, including 13 marked `defect`, plus a fixture integrity
check. No production Next.js trending source was changed. The GO-006b update below records its later Go port.

Run `node --test scripts/contracts/github-trending.test.mjs`, or all contracts
with `npm run test:contracts`. The runner invokes the actual handler with only
fetch, the clock, process time zone and Math.random substituted. It restores
them after every case. No real credentials or external requests are used.

The fixture clock, time zone and random value are explicit inputs for the Go
port. Inject a clock/random source there rather than expecting two live random
generators to produce identical output. The recorded outcomes pin status, body,
content type, cache-control, upstream URL/headers and random-call count.

Coverage includes daily/weekly/monthly and empty defaults, first duplicate
query parameter, language validation, malformed upstream bodies, HTTP/network
failures, display fallbacks, colors, ranks 0/2/3/9/10, random minimum/maximum,
month overflow, leap year, UTC, Asia/Kolkata and New York DST.

Defects requiring an explicit decision before fixing behavior:

1. `starsToday` is fabricated: random values 0 and 0.999999 yield 50 and 549.
   `heatLevel` is based on array position, not measured activity.
2. C# is rejected by validation even though the language catalog includes it.
3. Search qualifiers are joined with literal plus signs inside the encoded
   `q` value; real GitHub query interpretation has not been verified.
4. Calendar subtraction uses the host's time zone. At 2026-03-08T23:30Z a
   daily query produces March 8 in New York versus March 7 in UTC.
5. `setMonth` overflows: March 31 minus one month becomes March 3 in 2026
   (March 2 in leap-year 2024), rather than February's last day.
6. The color map reads inherited properties: `__proto__` produces an object
   instead of a color string.
7. Upstream rate limits become generic 500 responses without retry metadata.

GO-006b scope: a standard-library Go port with shared fixtures,
clock/random injection, an owner lesson, and a disabled-by-default route switch.
Retain marked behavior until an approved contract revision changes both sides.
These fixtures are characterization, not approval of fabricated activity or
evidence of real-provider behavior. Quota, independent review, hosted race,
Vercel forwarding and cutover gates still apply.

## Go port (GO-006b)

`backend/internal/githubtrending` now runs all 34 fixtures through handler and
local HTTP-server tests. `Now` and `Random` functions inject the fixture inputs.
Runtime defaults are local time.Now and concurrent-safe math/rand/v2.Float64.
No contract or production Next trending behavior changed. Extra tests cover
request cancellation, oversized/trailing replies, and tokenless routing.
The public route is opt-in as `github-trending`; lesson 17 accompanies it.
Peer review, hosted race, quota and deployment gates still apply.

## REVIEW-005 additions (Claude Code, 2026-10-13)

`byte-order-mark` pins that `response.json()` skips a leading byte-order mark.
Go answered 500 for it until the handler moved to `jscompat.DecodeJSON`, which
reads a reply as `response.json()` does. The Go handler also writes one log
record for a failed request: the stage and the cause, never the address.
