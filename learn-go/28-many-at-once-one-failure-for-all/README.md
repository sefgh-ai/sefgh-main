# Lesson 28: Many lookups at once, one failure for all

**You will learn:** how the Go comments route reads many comments' details at the same time and why one failure decides the answer, as JavaScript's `Promise.all` does. You will also see the difference between `parseInt` and `Number`, how to count rows without fetching them, and how to test requests whose order is never the same twice.

**Real code:** `details` and `detail` in `backend/internal/comments/handler.go`, `Count` in `backend/internal/supabaserest/supabaserest.go`, `ParseInt` in `backend/internal/jscompat/parseint.go`, and `sorted` in `backend/internal/comments/contract_test.go`.

## The problem in the app

Under each repository is a comment list. For every comment the Next.js handler fetches three more things: the author's profile, an admin lookup when there is no profile, and the number of replies. It does all comments together (Go, since contract version 3, reads the profile's `full_name` and `avatar_url` and skips the admin lookup, R-040 and R-075):

```js
const commentsWithDetails = await Promise.all(comments.map(async (comment) => { ... }))
```

Fifty comments means 150 more requests, all started at once.

## Many at once, but not all at once

The Go port reads the details with goroutines, like the starred route in lesson 23, but **at most four comments at a time**. That uses the same "slots" channel as lesson 18. All of them share one deadline, `DetailsBudget`, so one slow lookup cannot hold the reply. `TestDetailsRunFourAtATime` counts how many run together, and `TestDetailsBudgetBoundsHangingReads` makes every lookup hang and checks that the reply still comes quickly.

## One failure decides

`Promise.all` rejects as soon as any one promise rejects. Here that happens when a comment is `null`, or when its author's id is not a lower-case UUID (auth-js checks it before the admin lookup and throws). The whole list then answers 500. The Go code did the same until contract version 3 (R-040), which dropped the admin lookup: now only a `null` comment fails the list. The first goroutine that fails records it, then calls `cancel()` on the shared context, so the others stop early instead of doing work nobody will use:

```go
if !ok {
	mu.Lock()
	failed = true
	mu.Unlock()
	cancel() // one rejection decides the answer; stop the rest
	return
}
```

`failed` is shared by every goroutine, so the mutex guards it (lesson 10).

## Counting without fetching

The reply count asks the database for `HEAD` with `Prefer: count=exact`. `HEAD` means "headers only, no body". The answer is in a header, `Content-Range: 0-1/2`, and the number after the slash is the count. `supabaserest.Count` reads it with `parseInt`, as supabase-js does.

## parseInt is not Number

The page size comes from the URL: `parseInt(searchParams.get('limit') || '50')`. `parseInt` reads digits until the first character that is not one, so its answers differ from lesson 27's `Number`:

| text | `parseInt` | `Number` |
|---|---|---|
| `" 7px"` | 7 | NaN |
| `"12.9"` | 12 | 12.9 |
| `"-0x1f"` | -31 | NaN |
| `"1e3"` | 1 | 1000 |

`jscompat.ParseInt` copies `parseInt`; every row of its test came from Node.

## A cap, and the number that slips past it

Every comment cost three more requests (two in Go since version 3, which dropped the admin lookup), so on 2026-10-28 you capped a page at 50 (R-086). The Go handler now has, right after reading `limit`:

```go
const MaxLimit = 50

if limit > MaxLimit {
    limit = MaxLimit
}
```

`const` names a value fixed when the program is compiled, like a top-level `const` in JavaScript that can never be reassigned. Its capital M exports it, so tests in other packages can read `comments.MaxLimit`.

`limit` is a `float64`, because `parseInt` can answer `NaN`. Any comparison with `NaN` is false, in Go as in JavaScript: `NaN > 50`, `NaN < 50` and `NaN == NaN` are all false. So text such as `abc` passes the cap unchanged and is sent as `limit=NaN`, exactly as before; the database refuses it before any per-comment request, which is why the cap can ignore it. If you ever need to catch `NaN`, ask `math.IsNaN(limit)`, the way JavaScript has `Number.isNaN`.

The contract moved to version 2 with two cases, `limit=51` and `limit=1000&offset=20`. The Next.js handler still sends the number as given until it is retired, so its test converts those two cases back.

## Testing requests in any order

Goroutines finish in a different order on every run, so the comments contract test cannot expect the requests in the order Node made them. For the list, it sorts both the recorded requests and Go's before comparing. The requests must be the same, each the same number of times, in any order. That's your exercise.

## Your turn

Open `exercise.go` and write `sameInAnyOrder`.

```text
go test ./28-many-at-once-one-failure-for-all
go test -tags solution ./28-many-at-once-one-failure-for-all
```

## You now know

- A channel of slots limits how many goroutines run at once, and one context can bound them all.
- `Promise.all` fails as soon as one task fails. In Go, record the failure and cancel the shared context.
- `HEAD` with a count header answers "how many" without sending rows.
- `parseInt` and `Number` read text differently.
- Every comparison with `NaN` is false; `math.IsNaN` is the way to test for it.
- To compare lists whose order is not fixed, sort copies of both.
