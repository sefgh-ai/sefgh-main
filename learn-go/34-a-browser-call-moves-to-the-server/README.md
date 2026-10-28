# Lesson 34: A browser call moves to the server

**You will learn:** how a database call the browser used to make itself becomes a Go endpoint without changing what the page sees. You will see why the server never trusts a user id the browser sends, how `http.ServeMux` chooses between a fixed path and a wildcard, and how one small function wraps every endpoint with a sign-in check.

**Real code:** `backend/internal/searchhistory/handler.go`, `src/lib/supabase/search-history.js` and `src/lib/go-data.js`.

## The problem in the app

Until now the browser saved and read your search history itself, straight from Supabase:

```js
await supabase.from("search_history").insert({ user_id: userId, query, ... })
```

Row-level security in the database made that safe: Supabase only let you touch your own rows. The plan (`docs/plans/browser-data.md`) moves these calls behind the Go backend, one area at a time. The owner chose a switch per area: with `search-history` in `NEXT_PUBLIC_SEFGH_GO_DATA`, the same JavaScript functions ask Go instead.

The functions keep their names and their answers. Only where they get the answer changes:

```js
if (usesGo(AREA)) {
  const rows = await askGo(`/api/search-history?${params}`, {}, []);
  if (rows !== NOT_SERVED) return rows;
}
// otherwise, the direct Supabase call as before
```

Go answers exactly what the function used to return: a row or `null`, a list, `true` or `false`, or the counts. If the Go route is not there (404), the module falls back to Supabase, so a half-done setup never loses a search.

## Never trust an id from the browser

The browser still sends the user id it was given. Go checks it against the user its sign-in check verified:

```go
if user != c.id {
	write(w, 200, "[]") // another user's id: nothing, as row-level security gave
	return
}
```

The id the browser sends is only a filter that must match. If Go used it to decide whose rows to read, anyone could change one number in a request and read someone else's history. Here a wrong id gets exactly what the database gave before, nothing, without even asking. The contract test `count-other-user` exists because an early version of `count` would have counted the caller's own searches for any id.

## A fixed path beside a wildcard

```go
mux.HandleFunc("GET /api/search-history/count", h.signedIn(h.count))
mux.HandleFunc("DELETE /api/search-history/{id}", h.signedIn(h.deleteOne))
```

`/api/search-history/count` could also match `/api/search-history/{id}`. Go's `ServeMux` picks the **more specific** pattern: a literal segment beats a wildcard, and a pattern with a method beats one without. Here the methods differ as well, and a method no pattern names gets 405 Method Not Allowed for free.

## Wrapping every endpoint

Every endpoint needs a signed-in caller. Instead of repeating the check five times, `signedIn` takes the endpoint and returns a new handler that checks first:

```go
func (h *Handler) signedIn(next func(http.ResponseWriter, *http.Request, caller)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, session, status := h.User(r)
		if status != 200 { ... 401 ...; return }
		next(w, r, caller{id: id, session: session, db: db})
	}
}
```

The returned function is a **closure**: it remembers `h` and `next`. `h.count` is a **method value**, a method bound to its receiver that can be passed around like any function. JavaScript does the same thing with `handler.count.bind(handler)`.

## Copy first, fix once

The browser called `increment_platform_stat` without `await`, and supabase-js only sends a request when it is awaited, so the search counter never moved (R-102). The Go endpoint does not call it either, for now. The port first reproduces what happens today, so the two can be compared. The fix lands once, in Go, after the area is switched on.

On 2026-10-28, with the area on Go in production, it landed. After a successful insert the endpoint counts the search, as the user:

```go
_, _, _ = c.db.RPC(r.Context(), c.session, "increment_platform_stat", []byte(`{"key":"total_searches"}`))
```

`RPC` answers three values: status, body and error. The counter is not critical, so all three are thrown away. Go makes you say so: each `_` is the blank identifier, a place to put a value you mean to ignore. In JavaScript you would just not use the result; in Go an unused variable will not compile (lesson 29), so `_` is how you write "ignored on purpose". The contract moved to version 2: the four successful saves gained a `go_database` with the extra call. The browser's own direct path, used only when Go does not answer, still never sends it, until it is retired.

## Your turn

Safety update (BUG-011): the `signedIn` wrapper now calls
`supabaserest.BoundRequest` before checking identity. One 24-second context
and connection read deadline cover sign-in, the incoming body and the
database call. See lesson 38 for why an outbound timeout alone is not enough.

Open `exercise.go` and write `countSources`, which counts rows by source as `getSearchHistoryCount` does.

```text
go test ./34-a-browser-call-moves-to-the-server
go test -tags solution ./34-a-browser-call-moves-to-the-server
```

## You now know

- A browser call can move to the server behind the same function, with a fallback if the server route is missing.
- An id from the client is a filter to check, never a source of authority.
- `ServeMux` prefers the more specific pattern, so a literal path and a wildcard can sit side by side.
- A closure and a method value let one function wrap many handlers.
