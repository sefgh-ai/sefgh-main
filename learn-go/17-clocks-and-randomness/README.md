# 17. Pass in clocks and random numbers

The trending handler in `backend/internal/githubtrending/handler.go` uses today's
date and a random number. A test cannot predict either if it calls the real clock
and random generator. The handler accepts functions instead:

```go
type Handler struct {
    // Other settings omitted here.
    Now    func() time.Time
    Random func() float64
}
```

`func() time.Time` means a function taking no arguments and returning a time.
In JavaScript you might pass `{ now: () => fixedDate, random: () => 0.5 }`.
In Go, assigning nil means the optional function was not supplied. The handler
then uses `time.Now` and the standard library's `rand.Float64` from `math/rand/v2`.
Tests pass their own functions. No package-wide clock needs to be replaced.

The handler reads `now()` once per request and `random()` once for each returned
repository. A test function can also count its calls. A production-injected
function must be safe when requests run concurrently; the default random source
already supports that. Test counters here are local to sequential requests.

## Calendar days are not always 24 hours

`t.AddDate(0, 0, -1)` subtracts one day on the calendar in t's time zone.
`t.Add(-24 * time.Hour)` subtracts exactly 24 hours. Across daylight-saving
changes they can differ. `t.UTC()` changes the time zone used to display the same
instant. `Format("2006-01-02")` prints a date using Go's reference-date layout.

The existing JavaScript subtracts a local calendar day, then formats in UTC.
The Go port preserves that order. It also preserves month overflow: subtracting
one month from March 31 can land in March, just like JavaScript's setMonth.
The fixtures pin these surprising behaviors; a port cannot silently change them.

## A passing port can preserve a known defect

The old handler makes up `starsToday` with `Math.floor(Math.random()*500)+50`.
Go mirrors it with `math.Floor(random()*500)+50`. This is recorded as a defect,
not a trustworthy measure of daily stars. Fixed random inputs let both handlers
pass the same fixtures while the owner considers a better product contract.

The route remains public-only and forwards no caller or server GitHub token.
It stays off unless `github-trending` is selected in the Next.js Go-route switch.

## Exercise

Implement `previousDay(now func() time.Time) string` in this lesson's exercise.
Call the injected clock once, subtract one local calendar day, then format in UTC.
The tests include New Year and a New York DST transition. From learn-go:

```text
go test ./17-clocks-and-randomness
go test -tags solution ./17-clocks-and-randomness
```

The exercise ships unfinished. Try it before reading solution.go.
