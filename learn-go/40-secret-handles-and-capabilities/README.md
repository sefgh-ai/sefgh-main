# 40: Make secret access explicit

Real code: [`material.go`](../../backend/internal/apikey/material.go) and
[`lifecycle.go`](../../backend/internal/apikey/lifecycle.go). These form an
unwired API-key core. Lesson42 adds proposed SQL-backed RPC adapters; no new
route is registered and no SQL has been applied to the live database.

`NewExecutor` now creates an accounting-only service. Its management methods
return `ErrUnavailable`; ordinary `New` still requires both capabilities.

## Private fields, public methods

In JavaScript you might put a token in a class's `#value`. Go uses a lowercase
field name to keep it inside its package:

```go
type revealState struct {
    mu    sync.Mutex
    value string
}

type Secret struct {
    state *revealState
}
```

`state` and `value` cannot be read by another package. The caller gets a `*Secret`
and calls `Take()`. That method locks the shared state, returns its value once,
then clears it. Another goroutine receives `ErrRevealed`. Copying a `Secret`
value copies only its pointer: both handles share the same reveal state. The
mutex itself is never copied. The redaction method has a value receiver so both
a handle and its pointer stay redacted when formatted; JSON rejects both too.
Independent review caught why those two details matter: a pointer-only formatter
and directly embedded state let a value copy reveal or print the token again.

This protects the **issuance path**. The API client must retain the credential
it was explicitly given to make later calls. Go does not promise to erase all
copies of a string from memory. A one-time handle also does not establish the
browser dialog, `no-store` response or database rules by itself.

The real code generates a 32-byte random secret and a separate public selector.
It stores a SHA-256 verifier, not the credential. `Verifier.Bytes()` is the
explicit persistence boundary. Default formatting redacts it, and JSON cannot
serialize it directly. `Parse` accepts the new credential format only; a stored
digest or a legacy plaintext key is not automatically accepted.

The cryptographic operations come from Go's standard library:
[`crypto/rand`](https://pkg.go.dev/crypto/rand),
[`crypto/sha256`](https://pkg.go.dev/crypto/sha256), and
[`crypto/subtle`](https://pkg.go.dev/crypto/subtle).

## An interface limits a capability

`Management` can create, list and revoke a verified owner's keys. `Accounting`
can look up a verifier and atomically reserve/complete server usage. A function
accepting only `Management` cannot call `Reserve`: that method is absent from
the interface, even when one test object implements both.

These Go types clarify which operations a future adapter needs. They do not
replace authentication, database roles or row-level security. The owner argument
must come from verified authentication, and database capabilities still need
their own grants and tests.

`Execute` never passes the credential to its work callback. It reserves usage
first; a failed reservation causes zero upstream work. Its deferred completion
uses a bounded context even if the request was cancelled. The mock store proves
the required state transitions locally; production transaction behavior remains
a separate gate. See the [core contract](../../contracts/api-key-lifecycle/README.md).

## Your exercise

`state.go` provides the shared handle/state types for ordinary builds, the
exercise and the solution. Complete `take` in `exercise.go`. It returns the stored string and `true` once;
later calls return `""` and `false`. A nil handle returns `""` and `false`.
Use the shared `handle.state`, lock before reading/changing its value, and use
`defer` to unlock on every return. Nil or zero-state handles return false. Tests
include multiple goroutines and a value copy taking the same handle.

From `learn-go/`:

```powershell
go test ./40-secret-handles-and-capabilities
go test -tags solution ./40-secret-handles-and-capabilities
```

The first command fails until you finish your exercise. The solution command
shows the expected behavior without completing your file.
