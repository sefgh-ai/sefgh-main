# 46. Port a worker: record it, then control time

Real code: `backend/internal/reposync` and `backend/cmd/reposync`. RepoSync is a
Python program that fetches GitHub repositories by topic and saves them. It is
not a web route, so there is no Next.js handler to compare with. This lesson is
about how it was moved to Go anyway.

## Record the original first

Every port in this project starts from fixtures: what the old code really did,
odd parts included. Here the old code is Python, so
`scripts/reposync/record.py` runs RepoSync's own files against a fake GitHub and
a fake database on your machine. It replaces only the outside world:

- the database and GitHub addresses point at the fake;
- `time.sleep` is swapped for a function that writes the seconds down;
- the clock is fixed, so every run records the same thing.

The result is `contracts/reposync/cases.json`. The Go test replays each case
against the Go worker and must see the same requests, in the same order.

Recording found something nobody knew: when every GitHub key is used up,
RepoSync crashes. It subtracts a time with no zone from a time with a zone,
and Python refuses. The port keeps that behaviour on purpose
(`ErrResetWaitCrash`), so the two can be compared until the switch.

## Time you can control

```go
type Config struct {
	Now   func() time.Time
	Sleep func(time.Duration)
	// ...
}
```

A function is a value in Go, as in JavaScript. The real program passes
`time.Now` and `time.Sleep`. The test passes a fixed clock and a `Sleep` that
only appends to a slice, so a case with a 60-second backoff runs in
milliseconds. It is the same idea as Jest's fake timers, with no library: the
code asks for time instead of reaching for it.

## Stopping politely

```go
type Worker struct {
	stop atomic.Bool
	// ...
}

func (w *Worker) Stop() { w.stop.Store(true) }
```

Ctrl+C runs in another goroutine, while the worker reads the flag in its own.
Two goroutines touching a plain `bool` is a data race; `atomic.Bool` makes each
read and write whole. RepoSync's Ctrl+C means "finish this topic, then stop", so
the worker checks the flag where the original did. A `context` would cancel
the requests in flight, and a half-fetched topic would be saved as complete.

## A Go time always knows its zone

In Python a `datetime` may have no zone at all ("naive"). Go's `time.Time`
always has one (UTC, local, or a fixed offset), so subtracting two of them
always works. To write RepoSync's zone-less timestamps, the port formats a
time in the original's zone without showing the zone: `isoformat` in
`pyfmt.go`.

## Your exercise

Implement `wait` in `exercise.go`. It sleeps one second at a time, up to
`seconds`, and stops early as soon as `stopped()` reports true. It checks
before every sleep, like RepoSync's backoff loop, and returns how many seconds
it slept.

```powershell
go test ./46-porting-a-python-worker
go test -tags solution ./46-porting-a-python-worker
```

The exercise is intentionally unfinished. The solution shows one way to do it.
