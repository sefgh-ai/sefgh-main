# 17. Pass in clocks and random numbers

## A Go map does not inherit JavaScript object properties (BUG-043)

The real `languageColor` function now returns a `string`. It reads the small
`map[string]string` of known colours using `color, ok := colors[name]`. If `ok`
is false, it returns `#8b949e`. Names such as `__proto__` and `constructor`
are ordinary strings; Go maps have no prototype chain. A JavaScript equivalent
would check `Object.hasOwn(colors, name)` before reading `colors[name]`.

The earlier port deliberately emulated JavaScript's inherited values so it could
be compared with the old handler. Owner-approved contract version 8 removes that
emulation. Returning `string` also prevents an object or an omitted field from
being used as a colour. `Item` uses this result for both trending endpoints.
The regression fixtures retain the old Next.js reply separately in `next_expect`.

Query encoding has a different concern: spaces separate GitHub search terms,
while the plus signs in `language:C++` belong to the name. `EncodeURIComponent`
turns those plus signs into `%2B`; decoding the query restores `C++`, rather than
turning its plus signs into spaces. R-068 already made this correction; BUG-043
adds an explicit fixture integrity check alongside the existing upstream test.

The trending handler in `backend/internal/githubtrending/handler.go` uses today's
date. A test cannot predict it if the handler calls the real clock, so the handler
accepts a function instead:

```go
type Handler struct {
    // Other settings omitted here.
    Now func() time.Time
}
```

`func() time.Time` means a function taking no arguments and returning a time.
In JavaScript you might pass `{ now: () => fixedDate }`.
In Go, assigning nil means the optional function was not supplied. The handler
then uses `time.Now`. Tests pass their own function. No package-wide clock needs
to be replaced.

The handler reads `now()` once per request and uses that one moment twice: for
the start of the search period, and to measure each repository's stars per day
since it was created. A production-injected function must be safe when requests
run concurrently.

Until 2026-10-14 the handler also took `Random func() float64`, injected the same
way, for a random number it showed as "stars today". That number is gone (see the
end of this lesson), and so is the field. Passing randomness in works exactly like
passing the clock in, if you ever need it.

## Calendar days are not always 24 hours

`t.AddDate(0, 0, -1)` subtracts one day on the calendar in t's time zone.
`t.Add(-24 * time.Hour)` subtracts exactly 24 hours. Across daylight-saving
changes they can differ. `t.UTC()` changes the time zone used to display the same
instant. `Format("2006-01-02")` prints a date using Go's reference-date layout.

The existing JavaScript subtracts a local calendar day, then formats in UTC.
The Go port preserves that order. It also preserves month overflow: subtracting
one month from March 31 can land in March, just like JavaScript's setMonth.
The fixtures pin these surprising behaviors; a port cannot silently change them.

## A passing port can preserve a known defect, until the owner decides

The handlers used to make up `starsToday` with `Math.floor(Math.random()*500)+50`,
and Go mirrored it with `math.Floor(random()*500)+50`. That was recorded as a
defect, and a fixed random input let both handlers pass the same fixtures.

On 2026-10-14 you chose a real measure instead. Contract version 2 replaces it
with `starsPerDay`: the stars divided by the days since the repository was
created, at least one day, rounded down. Both handlers compute it from the same
injected clock, so the fixtures still pin it exactly. In Go:

```go
days := math.Max(1, float64(now.UnixMilli()-created.UnixMilli())/(24*60*60*1000))
return math.Floor(count / days)
```

Counting in whole milliseconds matches JavaScript's `Date.now()`, so the two
round down the same number. That is how a contract change works here: the
fixtures, the Next.js handler and the Go handler change together.

The route remains public-only and forwards no caller or server GitHub token.
It stays off unless `github-trending` is selected in the Next.js Go-route switch.

## A plus sign that GitHub read literally (version 3)

On 2026-10-15, testing the new Vercel project showed that trending never worked
on the live site: every request ended in a 500. The handler built its GitHub
search like this, and Go copied it faithfully:

```go
search := "stars:>100+created:>" + date
u := base + "/search/repositories?q=" + jscompat.EncodeURIComponent(search)
```

In a URL's query, a bare `+` stands for a space. But `EncodeURIComponent`, like
JavaScript's `encodeURIComponent`, turns `+` into `%2B`, which means "a real
plus sign". GitHub received one long word, `stars:>100+created:>...`, and
answered 422. The fixtures did not notice: their stand-in for GitHub answers
whatever it is sent. Now the terms are separated by spaces, which encode as
`%20`:

```go
search := "stars:>100 created:>" + date.UTC().Format("2006-01-02")
```

`TestSearchTermsReachGitHubAsSeparateWords` reads the query back the way
GitHub does, with `r.URL.Query().Get("q")` and `strings.Fields`, so it fails
if the terms ever run together again. The fix was made once, in Go, under the
owner's rule: the Next.js handler keeps the old query until trending is
switched to Go and that handler is retired.

On 2026-10-27 a second problem showed up (R-203). GitHub reads
`created:>2026-10-26` as "after that whole day", so "daily" covered only the
hours since midnight UTC, and early in the day the list was empty. The search
now starts at a time, using a layout constant from the `time` package instead
of a hand-written one:

```go
search := "stars:>100 created:>" + date.UTC().Format(time.RFC3339)
```

`time.RFC3339` is `"2006-01-02T15:04:05Z07:00"`. For a UTC time it writes `Z`
as the zone, so GitHub gets `created:>2026-10-26T04:30:00Z`: the last 24 hours.
The exercise below still asks for a date; it practises `Format` the same way.

## Names from the selector (BUG-040, R-021)

Trending now also accepts the language endpoint's embedded catalog (lesson 12).
The original simple-name validation still works. Names such as Visual Basic
.NET must be one search qualifier, so Go puts double quotes around a catalog
name containing spaces before percent-encoding the whole query. In JavaScript
this is the same sequence: build `language:"Visual Basic .NET"`, then call
`encodeURIComponent` on the complete query. Encoding and search quoting solve
different problems; both are needed. Contract version 5 retains the rollback
Next.js handler's rejected answers in `next_expect`.

## Exercise

BUG-042 (R-023) gives trending a separate response for rate limits. The shared
`githublimit.Write(w, status, headers)` helper returns a boolean: true means it
already wrote a 429 response and the handler should return; false means normal
handling continues. This is like `if (writeRateLimit(...)) return` in JavaScript.
A GitHub 429 always qualifies. A 403 qualifies only with Retry-After or zero
remaining requests, so ordinary forbidden responses stay ordinary failures.
The helper copies the wait header and uses `*string` for metadata: a nil pointer
encodes as JSON null, while a present value stays text. It never sends GitHub's
error body to the visitor. The contract tests cover both missing and present
headers, including an HTTP date. Quick exercise: would HTTP 200 with zero
remaining be a failed request? No; `success-with-rate-headers` pins that answer.

BUG-041 (R-022) changes the route to elapsed UTC days: daily 1, weekly 7,
monthly 30. `current.UTC().Add(-time.Duration(days) * 24 * time.Hour)` is like
`new Date(now.getTime() - days * 86400000)` in JavaScript. `AddDate` changes a
calendar date and can produce 23/25-hour days at DST or overflow February;
`Add` subtracts a duration. The full timestamp remains in the query. Contract
v6 tests month end and matching instants in New York and UTC. The existing
exercise below intentionally still practices the earlier calendar operation;
keep your work in `exercise.go` untouched. A separate quick exercise: March 1,
2026 at 00:05 UTC minus 30 days is January 30 at 00:05 UTC; find that cutoff
in `monthly-fixed-thirty-days`.

Implement `previousDay(now func() time.Time) string` in this lesson's exercise.
Call the injected clock once, subtract one local calendar day, then format in UTC.
The tests include New Year and a New York DST transition. From learn-go:

```text
go test ./17-clocks-and-randomness
go test -tags solution ./17-clocks-and-randomness
```

The exercise ships unfinished. Try it before reading solution.go.
