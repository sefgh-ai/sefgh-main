# Lesson 19: Counting requests

**You will learn:** keeping state between requests, why that state needs a lock, passing the time in so the logic can be tested, and reading the body of a POST request.

**Real code:** `Limiter` in `backend/internal/ailimit/limit.go`, and how `backend/internal/aisuggestions/handler.go` uses it.

## The problem in the app

The two AI helpers in the search box cost money on every call. You decided on 2026-10-13 that one address may make 30 AI calls in five minutes. Past that, the helpers still answer, from their built-in lists, and no AI is called.

So the server has to remember something between requests: how many calls each caller made recently.

## State that outlives a request

In JavaScript you would reach for a `Map` at the top of a module, and `src/lib/ai/guard.js` does exactly that. In Go the state lives in a struct, created once when the server starts and handed to the handlers that need it:

```go
searchAllowance := ailimit.New(ailimit.Requests, ailimit.Window)
```

That line is in `backend/cmd/api/main.go`. Both helper routes are given the same `searchAllowance`. It is a pointer, so they share one count, which is the rule: 30 across the two helpers, not 30 each.

## A moving window

For each caller the limiter keeps the times of their recent requests. On every request it does three things: throw away the times older than five minutes, refuse if 30 are left, otherwise add this one.

```go
cutoff := now.Add(-l.window)
kept := c.times[:0]
for _, at := range c.times {
	if at.After(cutoff) {
		kept = append(kept, at)
	}
}
c.times = kept
```

`c.times[:0]` looks odd. It is a slice with no elements that uses the same memory as `c.times`. Appending to it writes over the old list from the start, so this filters the list in place without making a new one. In JavaScript you would write `times.filter(...)` and get a new array.

When the caller is refused, the limiter says how long to wait: until the oldest remembered request is five minutes old.

## Why there is a lock

Go runs every request in its own goroutine, as lesson 10 showed. Two requests from the same caller can be inside `Take` at the same moment. Both could count 29, both could add one, and the caller would get 31. Worse, a Go map that two goroutines write at once stops the whole program.

JavaScript does not have this problem, because only one piece of JavaScript runs at a time. Go does, so `Take` begins like this:

```go
l.mu.Lock()
defer l.mu.Unlock()
```

Now only one goroutine at a time can be between those two lines. One of the tests starts 64 goroutines that all press on one caller, and checks that exactly 30 requests get through.

## Pass the time in

```go
func (l *Limiter) Take(key string, now time.Time) int
```

`Take` does not call `time.Now()`. The handler does, and passes the result. A test passes any time it likes, so "is the caller allowed again exactly five minutes later?" is one line and takes no time to run. This is the idea from lesson 13 again.

The Go test and the JavaScript test of the two limiters use the same list of steps and expect the same answers. That is how two implementations in two languages are kept the same.

## Forgetting callers

A map that only grows is a slow leak, and anyone can invent addresses. The limiter remembers at most 10,000 callers and forgets the one it has not seen for longest.

A JavaScript `Map` remembers the order things were added. A Go map has no order at all, so the limiter keeps a list beside the map, from `container/list`, and moves a caller to the back of it each time they are seen. The front of the list is always the caller to forget.

## Reading the body of a POST

These are the first routes in the Go backend that receive a body. The handler reads it like this:

```go
body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxRequestBytes))
```

`r.Body` is a stream, not a string. `io.ReadAll` reads it to the end. `http.MaxBytesReader` wraps it first so that reading stops, with an error, after one megabyte. Without that, a caller could send a huge body and the server would try to hold all of it in memory. The bytes then go through `jscompat.DecodeJSON` and the type checks from lesson 05.

## What this limiter is not

It counts inside one running program. If the host runs three copies of the server, each has its own count, and a restart forgets everything. It slows a caller down. It is not an account balance. A count shared between copies needs a database, and that is a later step.

## Your turn

Open `exercise.go` and write `allow`. It is the heart of the real limiter without the waiting time and without forgetting callers:

1. Lock, and unlock with `defer`.
2. Keep only the times for this key that are inside the window.
3. If the limit is reached, return `false` and record nothing.
4. Otherwise record `now` and return `true`.

```text
go test ./19-counting-requests
go test -tags solution ./19-counting-requests
```

One test calls `allow` from 64 goroutines at once, each with callers of its own. If you leave the lock out, that test stops the program with "concurrent map writes" instead of failing politely. That message is Go telling you what the lock is for.

## You now know

- State shared by requests lives in a struct that is created once and passed to the handlers.
- Anything two goroutines can change needs a lock around it.
- `slice[:0]` and `append` filter a slice in place.
- Pass the clock in, and a test can stand anywhere in time.
- A Go map has no order; keep a list beside it when order matters.
- Cap a request body with `http.MaxBytesReader` before reading it.


## BUG-065: normalize before taking an allowance

Suggestions reject present non-text queries with400, trim before every length check and provider prompt, filter blank/non-text items and deduplicate before taking three AI results. Built-in results are suppressed only by selected AI items; final output remains capped atfive. Missing queries retain the empty-list response.

The comma-ok map lookup distinguishes a missing query from an explicitly provided null, false or zero. A string type assertion validates the value before trimming it. map[string]bool acts like a JavaScript Set for selected suggestions; filtering before the three-item cap lets valid later items survive invalid early items. Padded short queries return before the limiter and provider. Existing exercises are unchanged.
