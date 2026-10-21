# 43: HTTP tests run concurrently too

Real code: `TestRPCNoRetryNoErrorPayloadAndNoCredentialRedirect` in
[rpc_edges_test.go](../../backend/internal/apikey/rpc_edges_test.go).

JavaScript normally runs callbacks on one event loop. Go's `httptest.Server`
runs request handlers in other goroutines. The test function and a handler can
access the same variable at the same time. A plain `calls++` is a read followed
by a write; it is not synchronization.

Hosted `go test -race` caught our test reading the request count after a handler
hijacked and closed a connection. A network error is not a Go memory-ordering
guarantee. Ordinary local tests passed, which did not establish race safety.

The corrected test uses `sync/atomic`:

```go
var calls atomic.Int64
// In each handler:
calls.Add(1)
// In the test:
got := calls.Load()
```

Atomic operations coordinate accesses to that one value. They do not make a map
or a group of related fields atomic. Use a mutex when several fields must change
together. Never copy an `atomic.Int64` after first use; pass its pointer instead.

## Your exercise

Implement `countCalls`: run `workers` goroutines, each recording `each` calls
through a shared atomic counter. Wait for all workers before returning its
final count. Return zero for nonpositive inputs. Use a `sync.WaitGroup`, pass the
counter pointer to workers, and use `Add`/`Load` rather than ordinary arithmetic.
Each invocation must use its own counter.

From `learn-go/`:

```powershell
go test ./43-atomic-test-counters
go test -tags solution ./43-atomic-test-counters
```

The exercise is intentionally unfinished. On a machine with a C compiler,
`go test -race -tags solution ./43-atomic-test-counters` additionally checks
concurrent memory accesses. Hosted CI runs the backend race detector.
