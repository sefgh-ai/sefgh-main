# Trending developers contract (GO-007a)

Version 1 characterizes the unchanged `GET /api/github/trending-developers`
handler at `086a6dca2e1ca369a223ce9cdc2ce2b2fe735ee3`. There are 57 cases,
23 marked `defect`, plus two integrity/ordering checks. GO-007a recorded 48;
REVIEW-005 added nine from the same unchanged handler. The caller is
`src/hooks/trending/useTrendingData.js`. No production behavior was changed.

Run:

```text
node --test scripts/contracts/github-trending-developers.test.mjs
npm run test:contracts
```

## Recorded behavior

- Empty or missing `since` means daily; daily/weekly/monthly are accepted.
  The first repeated parameter wins. Invalid periods return 400 without fetch.
  A language query parameter is ignored.
- A user search requests 30 users, then only the first 20 receive enrichment.
  Each gets one repository request, for at most 21 upstream requests per call.
- All enrichment fetches are launched together with Promise.all. Results stay
  in search order, even when enrichment finishes out of order. Ranks start at 1.
- The first returned repository supplies the popularRepo card. No repositories
  or a non-success HTTP reply uses the no-public-repositories fallback.
- A network failure, malformed JSON or null repository body can fail the whole
  response. Sibling requests are not cancelled by the existing handler.
- Incoming auth headers and GITHUB_TOKEN are ignored. No credential is sent
  upstream. There is no route-specific cache-control or retry-after header.
- Missing fields are omitted from JSON; explicit null fields remain null.
  Missing, null or empty descriptions use the existing display fallback.

## Fixture format and Go port guidance

Each case fixes the clock and time zone. `upstream` supplies replies in the
existing handler's invocation order: search first, then repository enrichment.
Replies may use a delayed completion, raw JSON body or network error.
`expect.calls` pairs each reply with its requested URL, normalized wire URL and
headers. Both URL forms matter: raw `>` becomes `%3E` on the wire, and path
segments from an upstream login can be normalized by the URL implementation.

The Go contract runner should pair replies by the corresponding expected URL,
not rely on goroutine launch order. Compare the search call and the multiset of
enrichment calls; preserve output order and ranks. Concurrency scheduling order
is not an externally visible contract. Bounded concurrency and cancellation may
be explicit operational differences, but must not silently change output/status
behavior. Keep standard-library dependencies and use jscompat for query parsing.

The Node helper restores clock, time zone, fetch, console and the decoy token
after each fixture. It drains its own pending mocked requests even when the
handler returns early, preventing one case from leaking work into another.
The fixtures do not make real GitHub or Supabase requests.

## Recorded defects and unknowns

1. Local-calendar subtraction followed by UTC formatting changes dates across
   daylight-saving transitions. At 2026-03-08T23:30Z the daily date is March 8
   in New York and March 7 in UTC.
2. Month subtraction overflows rather than clamping February's final day.
3. Every enrichment HTTP failure, including 429 and 500, is presented as no
   public repositories. Search failures become generic 500 without retry data.
4. Enrichment network/JSON failures fail the whole result, unlike HTTP failures.
5. Missing/unvalidated upstream login values are interpolated into repository
   URLs, permitting path/query changes. No credential is sent, but the wrong
   upstream resource can be requested.
6. The popular-repository label trusts the first response to `sort=stars`;
   whether this endpoint actually provides the intended sort is unverified.

The implementation also uses account creation date and follower count as an
approximation of trending activity. It has no route-specific quota or timeout.
These facts are not evidence of actual trending activity or live-provider parity.
Marked fixtures require owner-approved contract revisions before behavior fixes.

## Next bounded task

GO-007b: implement the Go handler with a clock, controlled fan-out, resource
bounds, shared fixtures, public-only/no-credential routing, default-off switch
and owner lesson 18. This recording is not a Go implementation, independent peer
review, deployed verification or authorization to waive cutover gates.

## GO-007b implementation

Go implements every case, in memory and via a local HTTP server.
Upstream calls are compared as a multiset because goroutine scheduling differs.
A real upstream socket test verifies four concurrent requests and ordered output.
The implementation bounds each reply to 2 MiB, HTTP calls to 10 seconds, and
the whole request to 25 seconds. It waits for workers instead of leaving them
running after an early Promise.all failure. These operational differences do
not change recorded response contracts. Lesson 18 and a default-off switch ship
with this port. Review, quota, hosted race and cutover gates remain.

## REVIEW-005 additions (Claude Code, 2026-10-13)

A differential check sent 32 inputs outside the first 48 cases to the Next.js
handler and to Go. Twelve answers differed. Nine cases now pin what the
Next.js handler does, and Go matches them:

| Case | Next.js behaviour | Disposition |
|---|---|---|
| `search-byte-order-mark`, `repository-byte-order-mark` | `response.json()` skips a leading byte-order mark | preserve |
| `number-in-place-of-user`, `array-in-place-of-user` | A search entry that is not an object is treated as a user with no fields; `/users/undefined/repos` is requested | defect |
| `boolean-login`, `object-login`, `array-login` | A login that is not a string is converted to text (`true`, `[object Object]`, `a,b`) and looked up | defect |
| `repository-reply-is-text` | A string reply has a length, so its first character is read as a repository with no fields | defect |
| `repository-reply-is-empty-text` | An empty string has length zero and is answered like an empty list | preserve |

These add to defect 5 above: nothing checks the shape of what GitHub returns.
GitHub does not send any of them.

Two differences are deliberate, listed in `docs/adr/0002-go-backend.md` and
pinned by `TestRecordedDifferencesFromNextJS`, not by fixtures:

- A numeric login keeps the digits GitHub sent. For `1.0` Go asks for
  `/users/1.0/repos`; JavaScript prints the number as `1`.
- A repository reply that is a JSON object is "no repositories" in Go even if
  it has a `length` field. Next.js reads the length, finds no first element
  and answers 500.

The Go handler writes one log record for a failed request: the stage and the
cause, never the address. The Next.js handler logs with `console.error`.
