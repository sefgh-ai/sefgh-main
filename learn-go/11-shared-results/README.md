# Lesson 11: Waiting for a shared result

**You will learn:** choosing between completion and cancellation with `select`.

**Real code:** `cacheFlight` and `repoCache.get` in
`backend/internal/githubrepos/cache.go`; `Handler.fetch` in
`backend/internal/githubrepos/handler.go`.

## One request, several callers

In JavaScript, several callers can await the same Promise. The Go cache has
an equivalent arrangement: a `cacheFlight` contains a reply, an error, and
a `done` channel. The loader sets the result, then closes the channel.
Every waiter receives the same result. A failure still settles that shared
operation; it must not force each waiter to fetch the same failure in turn.

Closing a channel does not send the result. It announces that the fields are
ready to read. Writes made before the close are visible after the receive.
Never write those fields again after publishing them.

## Let one waiter leave

Each caller has a `context.Context`. Its `Done()` channel closes when that
caller is cancelled or its deadline passes. `select` waits for one of several
channel operations:

```go
select {
case <-done:
    // The shared result is ready.
case <-ctx.Done():
    return "", ctx.Err()
}
```

If both channels are ready, Go can choose either case. Our exercise gives
cancellation priority by checking `ctx.Err()` again in the result case.
This is a choice the application makes, not a guarantee from `select`.

The real cache additionally retries when the caller doing the fetch was
cancelled. You are implementing only the waiting part, not retry or storage.

## Keep errors useful

Return the loader's error unchanged so `errors.Is` can recognize its cause.
When adding context, Go uses `%w`: `fmt.Errorf("read upstream body: %w", err)`.
Unlike building a new error from `err.Error()`, wrapping preserves the cause.

`Handler.fetch` wraps failures and logs their stage. The server supplies a
`slog.Logger`; tests can send its output to a buffer. HTTP responses still
use the existing contract's error text. Logs exclude request URLs, tokens,
response bodies and arbitrary panic values.

## Your turn

Finish `waitResult` in `exercise.go`. Wait until `done` closes or the context
is cancelled. On cancellation return an empty string and `ctx.Err()`.
Otherwise return `result.value` and `result.err`, preserving the error.
If both are ready, cancellation wins. Do not close `done`: only the producer
owns that signal.

From `learn-go`:

```text
go test ./11-shared-results
go test -tags solution ./11-shared-results
```

The exercise compiles but fails until you implement it. The solution is
separate, as in the earlier lessons. No network or sleep is needed.

## You now know

- How one completion channel can wake several waiters.
- How `select` combines completion with per-caller cancellation.
- Why wrapping errors and preserving HTTP error contracts are separate jobs.
