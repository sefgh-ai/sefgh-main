# Lesson 09: Path parameters

**You will learn:** how one Go route handles many repository URLs.

**Real code:** `Register`, `detail` and `contents` in `backend/internal/githubrepos/handler.go`.

The earlier search route reads `?q=react`. Repository details puts its inputs
in the path: `/api/github/repo/octo/demo`. In Next.js, the folder names
`[owner]/[repo]` supply `params`. Go's standard router names these values in
the pattern:

```go
mux.HandleFunc("GET /api/github/repo/{owner}/{repo}", h.detail)
```

Inside `detail`, `r.PathValue("owner")` is `"octo"`, and
`r.PathValue("repo")` is `"demo"`. The same handler works for every matching
repository. `GET` patterns also accept HEAD; the server suppresses its body.

Go decodes percent escapes in each matched segment. Do not decode the value
a second time. Query inputs still use `jscompat.ParseQuery`: path parameters
and query parameters have different rules, especially for `+`.

## Test through the router

Setting a URL on a request does not fill in path values by itself. The router
does that when it matches a pattern. Our contract tests therefore call
`mux.ServeHTTP`, not `detail` directly.

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /repos/{owner}/{repo}", describe)
rec := httptest.NewRecorder()
mux.ServeHTTP(rec, httptest.NewRequest("GET", "/repos/octo/demo", nil))
```

The production registration lives in `Handler.Register`, and `main.go` calls
it once. Each route has its own Next.js switch; adding a Go handler does not
send browser traffic to it.

## Building the next request is a separate problem

Reading a path value and inserting it into another URL are separate steps.
An unescaped `#` becomes a fragment; `?` starts a query. Existing Next.js
repository handlers interpolate these values. Their defects are recorded
under `contracts/github-repositories/`, not silently fixed during migration.

`jscompat.FetchURL` in `backend/internal/jscompat/fetchurl.go` matches the
HTTP URL normalization covered by those fixtures, including dot segments
and UTF-8 escaping. It is a deliberately limited compatibility helper,
not a general URL parser or input validation. New APIs should validate
inputs and encode segments; changing these existing contracts needs an
owner decision. The new routes stay off pending review and cutover gates.

## Your turn

Finish `describe` in `exercise.go`. Return JSON with the owner and repository
from the path values. Set `Content-Type` to `application/json` before writing
the response. The tests also check an encoded space and reject POST.

From `learn-go`:

```text
go test ./09-path-parameters
go test -tags solution ./09-path-parameters
```

The first command fails until you finish. The second checks the supplied
solution. Next: [Lesson 10, shared caches](../10-shared-cache/README.md).
