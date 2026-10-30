# 31. Read a file without reading forever

Real code: `readAvatar` and `Handler.call` in
`backend/internal/avatar/handler.go`. The avatar route receives multipart form
data, uploads bytes to Storage, updates Auth and a profile, then cleans up old
files. Every call carries the same user's bearer token.

In JavaScript, `await file.arrayBuffer()` allocates the whole file. Go gives
you an `io.Reader`: something that supplies bytes as you ask for them. HTTP
request bodies, multipart parts and files all implement that interface.

```go
data, err := io.ReadAll(io.LimitReader(part, MaxFileBytes+1))
```

`LimitReader` wraps another reader. It lets at most that many bytes through.
The extra byte matters: if the limit is five and you read only five, you cannot
tell a five-byte file from a six-byte file. Read six, then check `len(data) > 5`.

This does not mean "truncate and accept". The avatar route returns an error
when it sees the extra byte. `http.MaxBytesReader` separately bounds the whole
request, including multipart headers and unrelated fields. `MultipartReader`
walks parts in order without saving temporary upload files to disk. It uses
the first field named `avatar`, matching JavaScript's `formData.get`.

## One deadline for the workflow

Five operations with separate ten-second timeouts could take fifty seconds.
The route's `context.WithTimeout` covers identity verification and all later
operations together. A child timeout can shorten the remaining time; it cannot
extend its parent's deadline. Cleanup has a shorter child budget.

`defer cancel()` releases the timer when the function returns. Every outbound
request receives that context. Go completes bounded best-effort cleanup before
answering, rather than leaving an unowned goroutine running after the response.
That timing differs from Next's detached cleanup and is recorded in the ADR.

A context deadline alone does not interrupt a slow incoming body read. The
handler also uses `http.NewResponseController(w).SetReadDeadline` on the server
connection, so a client cannot keep an upload open forever by sending no bytes.

For upstream replies, `defer resp.Body.Close()` releases the connection even
when parsing fails. It is a separate job from cancelling a context.

## Later change

`readAvatar` now returns the `filename` parameter as sent rather than
`part.FileName()`, and the upload path is cleaned exactly as storage-js does it
(REVIEW-028, 2026-10-24). Lesson 45 explains both.

On 2026-10-28 (R-041, contract version 2) a failed upload stopped asking
Storage for the list of buckets. Signed-in users cannot list them (no policy
allows it), so that request always came back empty and the answer named a
setup file that is not in the repository. The failure path is now one request
shorter and answers "Failed to upload avatar"; the whole check, a JSON decode
into `[]map[string]any` and a loop, was deleted rather than kept for nothing.

## Your exercise

Implement `readBounded` in `exercise.go`. Read at most `maximum+1` bytes.
Return an underlying read error unchanged. If an extra byte was found, return
`nil, true, nil`; otherwise return the bytes, `false`, and `nil`. The caller
owns the reader, so this helper must not close it.

From `learn-go/`:

```powershell
go test ./31-bounded-file-streams
go test -tags solution ./31-bounded-file-streams
```

The exercise is intentionally unfinished. The solution shows one way to do it.
Do not change the production file-size contract while experimenting: the
five-MiB limit, zero-byte acceptance and MIME-only validation are fixture-pinned.


## BUG-056: R-094

Avatar uploads detect PNG, JPEG, GIF87a/GIF89a and WebP signatures from bytes, reject empty/unsupported/truncated signatures, and derive MIME and stored extension from the detected format. User filenames and MIME labels cannot choose the stored suffix. The 5MiB bound, caller token, existing metadata/error/cleanup policies remain; full image decoding is outside this signature check.

The real backend and fixtures pin this change. Go returns early for errors and keeps the user's request scope. The regression was shown failing before the fix and under a deliberate break. Existing exercise.go files are untouched; lesson checks remain optional.

imageType returns two strings: detected MIME and a canonical extension. A switch without an expression checks byte prefixes with bytes.HasPrefix. The WebP branch checks length before slicing body[:4] and body[8:12], so a short upload cannot panic. An empty result means reject the upload. This checks signatures, not a full image decode. JavaScript similarly uses byte arrays and subarray; a file.type or filename string is only caller-provided metadata. Existing filename-copying exercises describe the original port; the current upload no longer derives its filename from the caller.


## BUG-057: R-096

A failed Auth metadata or profile write returns500 and attempts to delete exactly the newly uploaded object with the caller token. Compensation has a separate three-second bound and still runs after request cancellation. Rollback refusal stays a failure and is logged without details. These separate services are not made atomic; cleanup success is not promised when Storage refuses it.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.

The deferred closure reads committed when the handler returns. A failure leaves it false and invokes rollback; a successful profile write sets it true. context.WithoutCancel keeps context values but drops cancellation, so context.WithTimeout must immediately restore a short bound. This is compensation across services, not a transaction: a refused deletion may leave an orphan, and Auth/profile writes can have uncertain outcomes.


## BUG-058: R-097

Avatar500 responses carry only their fixed public error field; Storage/Auth/database/library and runtime diagnostic details are omitted. Sanitized stage logging and status codes stay unchanged. Next rollback replies retain their original details.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.

The fail function selects the public error field explicitly instead of serializing an upstream error. A map literal is a small allowlist: fields omitted there cannot accidentally appear in the response. The old diagnostic argument remains internal to the call boundary and is never logged or written.


## BUG-059: R-095

Avatar replacement uses an exclusive own-folder Storage insert across participating Go instances, unique random filenames and non-overwriting uploads. Cleanup snapshots all pages before deleting in batches, traverses explicit legacy folders, and preserves the current file, lock and newer timestamps. A failed page causes no partial-snapshot deletion. Lock release is bounded. Crash/uncertain-acquisition recovery is intentionally manual (R-209); hosted acceptance and all-writers protocol are rollout gates.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.

The lock is an exclusive Storage insert, not a Go mutex, so separate service instances coordinate through the same object key. crypto/rand supplies16 random bytes for a unique filename; encoding/hex formats them. The optional Random reader is for deterministic tests; nil uses the operating system cryptographic generator. Snapshot pagination finishes before deletion, because deleting while offset-paging can skip rows. Deferred release has its own one-second bound; it never steals an unacknowledged lock. A crash can leave the lock: see R-209 and the rollout/recovery plan.
