# 32. Keep a budget and a credential boundary

Real code: `BoundRequest` in `backend/internal/ailimit/request.go`,
`Client.Generate` in `backend/internal/aiprovider/provider.go`, and `post` in
`backend/internal/aienhance/handler.go`. These changes close the two findings
from the independent Phase 2 review.

## One budget starts before the body

A provider timeout does not include time spent receiving the visitor's JSON.
Six seconds uploading plus 25 seconds waiting for AI is 31 seconds; our server
allows 30 seconds to write a response. Start a 25-second request context at
handler entry instead, then pass it to identity verification and provider calls.

```go
r, cancel := ailimit.BoundRequest(w, r)
defer cancel()
```

This resembles giving all JavaScript fetches the same AbortSignal. A child
timeout can shorten the remaining budget but cannot extend its parent.
`BoundRequest` also sets a connection read deadline: context cancellation alone
does not unblock a stalled incoming body read. Keep that read deadline until
the server finishes draining/closing the request body, as lesson 31 explains.

The JSON contracts stay unchanged. The new behavior is that slow or hanging
requests stop within an explicit budget rather than occupying a handler forever.

## A redirect is another destination

Go's default HTTP client follows redirects. It can keep Authorization when a
redirect changes the scheme or port on the same host. A custom `x-api-key`
header needs protection too. Our provider clients refuse redirects entirely.

```go
confined := *client
confined.CheckRedirect = func(*http.Request, []*http.Request) error {
    return http.ErrUseLastResponse
}
resp, err := confined.Do(req)
```

`*client` copies the client's settings into a new struct. Transport and cookie
jar references remain shared, but assigning CheckRedirect changes only this
copy. Never mutate a shared client while requests may be using it.

`ErrUseLastResponse` means return the redirect response itself, with its body
still open. The provider code closes that body with `defer` and treats the 3xx
status as a failure. It never sends credentials or conversation text to the
redirect destination. This was tested against controlled servers, not by
claiming that a real provider issued such a redirect.

## Your exercise

Implement `confinedClient` in `exercise.go`: copy the supplied client, set its
redirect policy as above, and return the copy. Keep its transport and timeout;
leave the caller's original client unchanged.

```powershell
# From learn-go:
go test ./32-request-budgets-and-redirects
go test -tags solution ./32-request-budgets-and-redirects
```

The unfinished exercise fails cleanly. The test's transport is a local fake:
even the deliberately unsafe exercise never sends a real request or API key.


## BUG-062: R-013

Fallback titles collapse ECMAScript whitespace before selecting four words. A title emptied by quote stripping uses that fallback. The first message is JSON-escaped inside the title prompt, including quotes, backslashes and controls. The30-code-point cap remains.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.


## BUG-063: R-035

Enhance-query falls back to its built-in enhancement after provider errors or blank replies, including refused redirects and bounded oversized replies. JSON null is400 Query is required, with no provider call. Query/key isolation, provider read bounds and allowance behavior remain.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.

BUG-063 separates logging an upstream failure from answering the request: log records the sanitized cause, while ServeHTTP can still return a useful basic enhancement. Refusing a redirect remains mandatory; the fallback does not send credentials or the body to that destination. Reply limits are checked before parsing, and an oversized reply takes the same fallback path. Null input is rejected before any allowance or provider work.


## BUG-064: R-036

Built-in enhancement matches whole Unicode words, adds only words not already present, and trims surrounding whitespace. Operator/quoted queries retain their contents after trimming. Anthropic query text is JSON-escaped inside the prompt. Repeated basic enhancement is idempotent.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.

BUG-064 tokenizes with strings.FieldsFunc and Unicode letter/number/mark categories plus underscore. The original map decides which keyword groups match, while seen also records words added later: this prevents both repeated additions and accidental cascades between groups. In JavaScript these maps play the role of Set. Prompt contents use the existing UTF16 JSON writer to escape quote, backslash and control characters. An idempotence test verifies pressing enhance repeatedly does not keep growing the basic query.
