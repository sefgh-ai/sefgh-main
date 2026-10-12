# Lesson 13: Time and clocks

**You will learn:** how Go holds a moment in time, why the time zone changes the answer to "what day is it?", and how to test code that depends on today's date.

**Real code:** `dateRange` in `backend/internal/githubcontributions/dates.go`, and the `Now` and `Location` fields of `Handler` in `handler.go` beside it.

## The problem in the app

The contributions route asks GitHub for "about the last year, starting on a Monday". The Next.js handler works that out like this:

```js
const to = new Date()
const from = new Date()
from.setDate(to.getDate() - 365)

const dayOfWeek = from.getDay()
const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
from.setDate(from.getDate() - daysToMonday)
```

Two things feed into the answer that you cannot see in the code: what time it is, and **where the server's clock is set**. This lesson is about both.

## A moment, and what a clock shows

A `time.Time` is one moment. `time.Now()` gives you the current one.

The same moment looks different on clocks in different places. In Go you choose the clock:

```go
moment := time.Date(2026, 10, 11, 20, 0, 0, 0, time.UTC)

india, err := time.LoadLocation("Asia/Kolkata")
// check err

moment.Weekday()            // Sunday
moment.In(india).Weekday()  // Monday, because it is already 01:30 there
```

`In` does not change the moment. It changes which clock you read it from.

JavaScript's `Date` is one moment too, but it hides the choice: `getDay()` silently uses the zone of the machine it runs on, and `getUTCDay()` uses UTC. That is how the Next.js handler ended up depending on the server's zone. The contract records it as a defect, with a case where a server in UTC and a server in India pick Mondays a week apart for the same moment.

## Moving by days

```go
t.AddDate(0, 0, -365)        // 365 calendar days back; the clock shows the same time
t.Add(-365 * 24 * time.Hour) // exactly 8760 hours back
```

These usually agree. They differ when a daylight-saving change falls in between, because that day is 23 or 25 hours long. `setDate` in JavaScript behaves like `AddDate`.

`t.Weekday()` counts the same way as `getDay()`: Sunday is 0, Monday is 1, Saturday is 6.

The real `dateRange` does not use `AddDate`. It has its own helper, `wallClock`, for one rare case: a clock time that was skipped on the target day, such as 02:30 on the night the clocks go forward. JavaScript has a fixed rule for that, Go's standard function leaves it open, and the two have to agree. You do not need that for the exercise.

## Writing a time as text

Most languages describe a date format with letters, like `YYYY-MM-DD`. Go uses an example instead. You write out how one particular reference moment should look, and Go formats any other time the same way. The reference moment is:

```
Mon Jan 2 15:04:05 2006
```

So `2006` means "the year", `01` the month, `02` the day, `15` the hour on a 24-hour clock:

```go
t.Format("2006-01-02")                        // 2026-10-12
t.UTC().Format("2006-01-02T15:04:05.000Z")    // 2026-10-12T09:30:15.123Z
```

The second line produces exactly what JavaScript's `toISOString()` produces, which is what GitHub is sent.

## Code that asks "what time is it?" is hard to test

A function that calls `time.Now()` inside gives a different answer every day. A test cannot check it against a fixed expected value.

The fix is to hand the clock in from outside. In Go a function is a value like any other, so a struct field can hold one:

```go
type Handler struct {
	// Now returns the current time. Nil means time.Now.
	Now func() time.Time
	// Location is the time zone the date range is worked out in.
	Location *time.Location
	// ...
}
```

The real server leaves `Now` empty and gets the real clock. A test sets it to a function that always returns the same moment:

```go
Now: func() time.Time { return fixedMoment },
```

That is how the contract test can check 95 cases, each with its own date and time zone, in a few seconds. The Node version of the same test has to replace JavaScript's global `Date` to get the same effect.

## Your turn

Open `exercise.go` and finish three functions:

1. `previousMonday`: move a time back to the most recent Monday, keeping the clock time. A Monday stays as it is. Use `Weekday` and `AddDate`.
2. `isoMillis`: write a time the way `toISOString()` does.
3. `weekStart`: a method on `reporter`, whose `now` field is a clock you can replace. Return this week's Monday as `2006-01-02`, as seen from the given zone. When `now` is nil, use `time.Now`.

```text
go test ./13-time-and-clocks
go test -tags solution ./13-time-and-clocks
```

The first command fails until you finish. One test gives `weekStart` the same moment in two zones and expects two different Mondays. That is the app's time-zone defect, small enough to hold in your hand.

## You now know

- A `time.Time` is one moment, and `In` chooses the clock it is read from.
- `AddDate` moves by calendar days; `Add` moves by an exact duration.
- Go formats dates by example, using the reference moment `Jan 2 15:04:05 2006`.
- Passing the clock in as a function makes date logic testable.
