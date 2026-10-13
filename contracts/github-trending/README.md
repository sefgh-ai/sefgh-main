# GitHub trending characterization (GO-006a)

Version 1 pins the existing `GET /api/github/trending` handler at `7e0820c`.
There are 33 cases, including 13 marked `defect`, plus a fixture integrity
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

`backend/internal/githubtrending` now runs all 33 fixtures through handler and
local HTTP-server tests. `Now` and `Random` functions inject the fixture inputs.
Runtime defaults are local time.Now and concurrent-safe math/rand/v2.Float64.
No contract or production Next trending behavior changed. Extra tests cover
request cancellation, oversized/trailing replies, and tokenless routing.
The public route is opt-in as `github-trending`; lesson 17 accompanies it.
Peer review, hosted race, quota and deployment gates still apply.
