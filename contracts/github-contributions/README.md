# GitHub contributions contract

AUTH-001 (2026-10-13): current contract version **2**. The shared
[access contract](../github-access/README.md) now governs credentials and
private response caching. In fixtures, github_token is a verified per-user
credential, never an environment-token fallback. Anonymous reads use no token.
Prior version notes below are historical.

`cases.json` records what `GET /api/github/contributions?username=...` does. Version 1 was captured from the unchanged Next.js handler (`src/app/api/github/contributions/route.js`) at commit `73429e1`, before the Go port was written.

| Implementation | Check it with |
|---|---|
| Next.js handler | `npm run test:contracts` |
| Go handler, `backend/internal/githubcontributions` | `go test -count=1 ./...` inside `backend/` |

The Next.js runner is `scripts/contracts/github-contributions.test.mjs`. The Go test (`contract_test.go`) runs each case twice: in memory, and over real sockets against a fake GitHub. Neither makes a network request or needs a real token.

**No page or component in this checkout calls this route.** A search of `src/` finds no request to it. The owner chose on 2026-10-12 to port it anyway. Its opt-in route name is `github-contributions`, off by default.

## What the route does

It asks GitHub's GraphQL API for one user's contribution calendar over roughly the last year, using the server's `GITHUB_TOKEN`, and reshapes the answer into a grid of days plus six statistics.

## File layout

| Key | Meaning |
|---|---|
| `graphql_url` | The only upstream URL. Every call is a `POST` to it |
| `query` | The exact GraphQL text sent, whitespace included |
| `cases` | One request each |

Each case has:

- `request`: path and raw query string.
- `github_token`: the server token in effect. Absent means none is configured.
- `now`: the server's clock, as an ISO instant.
- `time_zone`: the server's time zone, as an IANA name.
- `calls`: the upstream requests expected, in order. Each gives the expected `url`, `method`, exact `headers` and GraphQL `variables`, followed by the stub reply: `status` with `body` or `raw_body`, or `network_error`.
- `expect`: the status and exact JSON body the caller gets.
- `disposition`: `preserve` or `defect`.

## What an implementation must match

1. Status and JSON body, compared structurally. A missing key is different from `null`.
2. `content-type: application/json`, and no `cache-control` or `retry-after`.
3. The upstream calls: same number, same URL and method, exactly the listed headers, and a JSON body equal to `{query, variables}`.

## The rules the cases encode

**Reading the request.** Checks run in this order, and the first failure answers:

| Check | Reply |
|---|---|
| `username` absent or empty | 400 `Username is required` |
| `username` does not match `^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$` | 400 `Invalid GitHub username format` |
| No server token | 500 `GitHub token not configured` |

The query string is read the way browsers read it: `+` is a space and the first value wins. Other parameters are ignored, so a caller cannot choose the dates.

**The date range.** `to` is now. `from` is computed in the **server's time zone**:

1. Take now and go back 365 calendar days, keeping the same clock time of day.
2. If that day is not a Monday, go back to the Monday before it, again keeping the clock time.
3. Write both as UTC with milliseconds: `2025-10-06T09:30:15.123Z`.

When step 1 lands on a clock time that was skipped by a daylight-saving change, JavaScript moves it forward past the gap, and step 2 keeps that later time. One case pins this.

**The upstream request.** `POST` with exactly two headers, `Authorization: Bearer <token>` and `Content-Type: application/json`. No `Accept` and no `User-Agent` are set by the handler.

**Replying.**

| GitHub answers | Caller gets |
|---|---|
| The request fails, or a 200 whose body is not JSON, or is JSON `null` | 500 `Internal server error` |
| Any status outside 200 to 299 | **The same status**, with `Failed to fetch GitHub data` |
| 200 with a truthy `errors` value | 400 `GraphQL query failed` |
| 200 without `data.user` | 404 `User not found` |
| 200 with a user but without `contributionsCollection.contributionCalendar.weeks` as a list of `{contributionDays: [...]}` | 500 `Internal server error` |
| 200 with a calendar | 200 `{grid, stats}` |

**The grid** is a list of weeks, each a list of days in GitHub's order. A day is `{date, count, color, weekIndex, dayOfWeekIndex}`, where `count` is GitHub's `contributionCount` and the two indexes are positions starting at 0. Other fields GitHub sends are dropped.

**The statistics:**

| Field | Rule |
|---|---|
| `totalContributions` | GitHub's own number, passed through. It is not recomputed from the days |
| `totalDays` | How many days are in the grid |
| `maxCount` | The largest `count`, or 0 |
| `activeDays` | Days whose `count` is above 0 |
| `currentStreak` | Sort all days newest first by `date`, then count days from the top until one has a `count` of 0 or less |
| `averagePerDay` | `totalContributions / totalDays` rounded to one decimal place, or 0 when there are no days |

The rounding is JavaScript's `toFixed(1)` applied to the stored floating-point value, with an exact tie going up. So 1/4 gives 0.3, while 7/20 gives 0.3 as well, because 0.35 is stored as slightly less than 0.35. A whole result is written as `2`, not `2.0`. Go's `strconv.FormatFloat` rounds an exact tie to the even digit and would give 0.2 for 1/4.

## Dispositions

`preserve` cases are the intended contract. `defect` cases record behaviour that is probably wrong and is waiting for an owner decision. Every implementation matches them until then. To change one, edit its expectation in the same commit as the fix to every implementation, raise `contract_version`, and note the decision in `docs/adr/0002-go-backend.md`.

The 18 open `defect` cases fall into seven groups:

| Group | Cases | What happens |
|---|---|---|
| Time zone | 5 | The range depends on where the server's clock is set. The same instant gives a `from` a week apart in UTC and in India. Daylight saving shifts `from` by an hour |
| 401 passed through | 1 | A rejected **server** token reaches the caller as 401, as if the caller were not signed in |
| Unknown user | 1 | GitHub reports an unknown login inside `errors`, so the caller gets 400 `GraphQL query failed`. The 404 branch is not reached for a real unknown user. The reply shape follows GitHub's documented behaviour and was not observed live |
| Empty error list | 1 | `"errors": []` counts as a failure |
| Reply is not an object | 4 | A bare number, string, list or `true` is reported as `User not found` |
| Streak | 1 | A newest day with no contributions yet makes the streak 0 |
| Shape not checked | 5 | A day without `color` or `contributionCount`, a `null` count, and a missing or `null` total all produce a 200 with keys missing or `null` |

## Not covered

- A `contributionCount` or `totalContributions` that is a string, boolean, list or object. JavaScript would coerce them; no case pins how. The Go handler passes such a value through, does not count it towards `maxCount`, `activeDays` or the streak, and writes `averagePerDay` as `null` for such a total.
- Days with a missing or unparseable `date`, where the streak's sort order is not defined. The Go handler leaves such days where they are.
- Methods other than GET, upstream redirects and timeouts. The Next.js handler sets no timeout; the Go handler gives up after 10 seconds and answers 500.
- A GitHub status that a reply cannot carry with a body, such as 304. Both answer 500.
- Live GitHub behaviour. GraphQL needs a token, and none was used.

## Recorded for the owner, outside the fixtures

- The route is public and spends the server token's GraphQL allowance. There is no sign-in check, rate limit or cache in front of it.
- The time-zone group disappears if the range is computed in UTC. That would be a contract change in both implementations.

## How the Go port handles the awkward parts

- The clock and the time zone are fields on the handler, `Now` and `Location`, so a test can set a case's `now` and `time_zone`. Left empty they mean the real clock and the machine's zone, which is what the Next.js handler uses. The tests import `time/tzdata` so named zones load on Windows.
- `wallClock` in `dates.go` settles a skipped or repeated clock time the way JavaScript does, by applying the offset in force before the change. Go's `time.Date` does not promise either answer.
- `toFixed1` rounds with exact arithmetic on the float64, not `FormatFloat`.
- "Truthy" for `errors` means anything but `null`, `false`, `0`, `""` or a missing key.

Both pieces of arithmetic were also compared with JavaScript on 24,000 random instants across 12 time zones and 200,000 random divisions, with no difference.
