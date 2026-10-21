# 44: Retry a receipt, with a stopping point

Read `RecoverCompletionPage` in
[`backend/internal/apikey/recovery.go`](../../backend/internal/apikey/recovery.go).
It finishes accounting for work whose result was saved earlier. It is a package
function; no scheduler or HTTP route starts it.

The function receives a small interface:

```go
type CompletionRecovery interface {
    Pending(context.Context, *PendingCursor) (PendingPage, error)
    Complete(context.Context, Completion) error
}
```

An interface describes the operations this function needs. `RPCAccounting`
already has these methods, so Go accepts it without an `implements` declaration.
Inside this function, the interface exposes no `Reserve`, key issuance, or
provider call. In JavaScript you might pass an object containing just two
functions. Go checks those method signatures when compiling.

Every call chooses a row limit and a time budget. `context.WithTimeout` derives
a context from the caller, so either the caller's cancellation or the budget can
stop I/O. `defer cancel()` releases the timer when the call finishes. This does
not make an adapter that ignores context interruptible; the real RPC adapter
passes that context into its HTTP requests.

The whole returned page is checked before any completion write. A receipt must
belong to its reservation and have a valid saved outcome. A missing receipt is
unknown. The function counts it and leaves the database attempt pending.

The return value contains both progress and an error:

```go
result, err := RecoverCompletionPage(ctx, store, after, options)
```

Go permits that combination. If two rows completed and the third failed,
`result.Completed` is two and `err` describes the failure. The resume cursor
stops before the unconfirmed row. Calling again can retry that same receipt;
SQL's exact-receipt idempotency makes an ambiguous reply safe to retry. Provider
work never runs again. Raw database errors are replaced with a fixed error.

A cursor is a position within one scan. Unknown rows still advance that
position so they cannot block later saved receipts. A later fresh scan starts
at `nil` and revisits those unknown rows: a receipt may have arrived meanwhile.
`More == false` means the scan reached the end, **not** that every attempt has a
known outcome.

Try the small exercise: implement `scan` in this folder's `exercise.go`.
Count every inspected row against `limit`, including unknown rows. Call
`Complete` only for a known receipt. On failure, return the progress before
that row so the caller can retry it. The tests use a tiny store that records
calls; there is no database or provider. `solution.go` is an optional reference.

When you want to check your work, run from `learn-go`:

```powershell
go test ./44-bounded-receipt-recovery
```

The exercise ships unfinished. Agents generate lessons alongside development;
lesson execution is optional under the owner's policy.
