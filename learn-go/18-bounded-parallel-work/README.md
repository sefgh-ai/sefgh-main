# 18. Run work concurrently without losing order

`backend/internal/githubdevelopers/handler.go` searches for users, then asks
GitHub about each user's repositories. Waiting for each request in sequence can
leave the process idle. Starting every possible request at once can overload
an upstream service. The handler permits four at once.

In JavaScript, the old handler uses `Promise.all(users.map(...))`. Go uses a
goroutine per item, a buffered channel for available slots, and a WaitGroup:

```go
slots := make(chan struct{}, 4)
var workers sync.WaitGroup
// Before starting each goroutine:
workers.Add(1)
// Inside each goroutine:
defer workers.Done()
slots <- struct{}{}
defer func() { <-slots }()
// After starting them all:
workers.Wait()
```

Sending to a full channel waits. Receiving releases a slot. `defer` ensures
the slot is released even when a request returns an error. Add to the WaitGroup
before starting the goroutine, so Wait cannot mistakenly observe zero workers.

## Keep the order separate from completion time

The handler allocates a result slice with one position per user. Each goroutine
writes only its own index. A fast request cannot jump ahead in the returned
rankings. Wait completes before the handler reads those positions. Concurrent
append operations would need synchronization; separate preallocated slots do not.

## Cancellation also applies while waiting

The real handler selects between acquiring a slot and `ctx.Done()`. If the
request is cancelled, waiting workers stop without calling GitHub. Active HTTP
requests carry the same context. One 25-second deadline bounds the entire route.
The handler waits for its workers before returning, so no request is abandoned
in the background. These runtime bounds differ from the old JavaScript handler;
the status/body contract and search order remain the same.

## Keep the reason for each failure

A goroutine can hand back more than a result. The handler keeps a second slice
with one error per user:

```go
results := make([]map[string]any, len(items))
errs := make([]error, len(items))
// Inside each goroutine:
results[index], errs[index] = h.developer(ctx, base, index, item)
```

The same rule keeps it safe: each goroutine writes only its own position, and
the handler reads the slice after `Wait`. A `nil` entry means that user worked.

After `Wait` the handler counts the failures and writes **one** log record
with the first cause. Twenty workers each writing a line would bury the reason.
`Promise.all` in JavaScript gives you the first rejection and drops the rest.
In Go you choose what to keep.

## Exercise

Implement `collect(count, work)` in exercise.go. Run two work calls at a time,
never more, and return results in index order after they have all finished.
The test checks that two really do run together, so a plain loop does not
pass. Inputs use nonnegative count. Keep all existing exercise files untouched.

From learn-go:

```text
go test ./18-bounded-parallel-work
go test -tags solution ./18-bounded-parallel-work
```

The exercise is deliberately unfinished. The solution is for checking your work.
