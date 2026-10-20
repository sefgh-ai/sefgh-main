# Lesson 38: Confining proxied requests

**You will learn:** how to keep a proxy's requests inside the destination and schema its rules describe, and why a request needs both a context and a connection deadline.

**Real code:** `backend/internal/dataproxy/handler.go`, `backend/internal/supabaserest/request.go`, and the `signedIn` wrappers in `backend/internal/onboarding` and `backend/internal/searchhistory`.

## A table name needs a schema

The proxy's policy permits `projects` in the database's `public` schema. PostgREST also accepts headers that choose a schema: `Accept-Profile` for reads and `Content-Profile` for writes. A different schema can have a table named `projects` too. Matching the table name alone would apply rules to an object those rules were never written for.

The handler checks both headers before making any database request. Every supplied value must name `public`. It then explicitly sets the outgoing method's schema to `public`, even if the browser sent neither header. That avoids depending on the database deployment's default exposed schema. Checking all values matters: HTTP can carry the same header more than once. In Go, `Header.Get` reads only one value; `Header.Values` gives you the list.

```go
for _, name := range []string{"Accept-Profile", "Content-Profile"} {
    for _, value := range r.Header.Values(name) {
        if strings.TrimSpace(value) != "public" {
            // Refuse before database I/O.
        }
    }
}
```

This narrows what the proxy serves. The database still checks the caller's token and row-level security. A proxy policy does not replace those checks.

## A redirect is another request

JavaScript's `fetch` and Go's HTTP client follow redirects by default. A redirect can replay a write, and some destination changes retain credentials. The proxy should ask only the configured database address.

```go
confined := *client
confined.CheckRedirect = func(*http.Request, []*http.Request) error {
    return http.ErrUseLastResponse
}
resp, err := confined.Do(req)
```

`*client` reads the struct the pointer points to, and assignment copies it. The copy keeps its transport and timeout while getting its own redirect function. This is a shallow copy: the transport itself is still shared. That is fine here; we change only the copy's `CheckRedirect` field. Mutating the original client could affect other requests.

`ErrUseLastResponse` returns the redirect reply without following it. The proxy closes that reply and answers a database-shaped 502. The browser's existing error handling can read it.

## Time starts before sign-in

Onboarding and search history now call `supabaserest.BoundRequest` at the beginning of their `signedIn` wrappers. Their 24-second context covers identity, incoming JSON and database I/O together. Each database call can shorten that budget; it cannot extend it.

A context cancels outbound requests. It does not by itself interrupt an incoming `Body.Read`, so the helper also sets the connection's read deadline. It leaves that deadline in place while `net/http` drains an unfinished body after the handler returns. Clearing it early could make that drain wait indefinitely. Lesson 32 introduces the same distinction for AI requests.

The regression test uses a real TCP connection, sends headers and an unfinished JSON body, and confirms that the server still answers. An in-memory `ResponseRecorder` alone cannot prove a socket deadline works.

## Your turn

Implement `publicSchemaOnly` in `exercise.go`. Return true if both schema headers are absent or every supplied value is `public` after trimming surrounding whitespace. Reject other names, empty supplied values, combined names and a second conflicting value.

From `learn-go`:

```text
go test ./38-confining-proxied-requests
go test -tags solution ./38-confining-proxied-requests
```

Try the exercise first. Existing exercises remain your work.
