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
