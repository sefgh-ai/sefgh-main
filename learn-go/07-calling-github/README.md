# Lesson 07: Calling GitHub

**You will learn:** how a Go program makes a web request of its own, and the three habits that keep it safe.

**Real code:** the middle of `ServeHTTP`, plus `isRateLimited` and `headerValue`, in `backend/internal/githubsearch/handler.go`.

## The problem in the app

The search handler is a middleman. It receives a request from the browser, makes its own request to GitHub, and turns GitHub's answer into ours. In JavaScript that middle step is `fetch`:

```js
const response = await fetch(url, { headers: { Accept: "application/vnd.github.v3+json" } });
```

In Go it is a few more lines, and each one is there for a reason.

```go
req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, url, nil)
req.Header.Set("Accept", "application/vnd.github.v3+json")

resp, err := h.client().Do(req)
if err != nil {
	// could not reach GitHub at all
}
defer resp.Body.Close()
```

There is no `await`. A Go call simply waits for its answer, and the server runs each incoming request separately, so one slow request does not hold up the others.

## Habit 1: always set a timeout

```go
var defaultClient = &http.Client{Timeout: DefaultTimeout}   // 10 seconds
```

Go's ready-made client, `http.DefaultClient`, has **no timeout**. If the other server never answers, your code waits forever, and enough of those waits will bring a server down. Always make your own client with a `Timeout`.

The Next.js handler has no timeout either. Adding one is a deliberate improvement in the Go version, and it is written down in `docs/adr/0002-go-backend.md`.

## Habit 2: pass the context along

`r.Context()` belongs to the browser's request. Handing it to `NewRequestWithContext` ties the two requests together: if the user closes the tab, Go notices and abandons the call to GitHub instead of finishing work nobody will see.

## Habit 3: close the body

```go
defer resp.Body.Close()
```

`defer` means "run this when the function ends, however it ends". It is Go's `finally`. A response body holds a network connection open until it is closed, so forgetting this slowly leaks connections.

Put the `defer` **after** the error check. When `err` is not `nil`, `resp` is `nil`, and there is nothing to close.

## An error is not the same as a bad status

```go
resp, err := client.Get(url)
```

`err` is only set when no reply arrived: the address was wrong, the connection dropped, the timeout ran out. A 404 or a 500 **is** a reply, so `err` is `nil` and you look at `resp.StatusCode` yourself. `fetch` in JavaScript works the same way, which is why the Next.js handler checks `response.ok`.

## Deciding what GitHub meant

The handler sorts GitHub's replies into four groups:

| GitHub says | We answer |
|---|---|
| 200, with the fields we expect | 200 and the results |
| "you are sending too many requests" | 429 |
| 422, "I cannot run this search" | 400 |
| anything else | 500 |

Spotting "too many requests" takes care, because GitHub signals it in more than one way. That logic is a small function:

```go
func isRateLimited(resp *http.Response) bool {
	if resp.StatusCode == http.StatusTooManyRequests {
		return true
	}
	return resp.StatusCode == http.StatusForbidden &&
		(resp.Header.Get("Retry-After") != "" || resp.Header.Get("X-Ratelimit-Remaining") == "0")
}
```

Before 2026-10-11 all of these became the same generic 500, so the page could not tell "slow down" from "broken".

## Headers

`header.Get("retry-after")` and `header.Get("Retry-After")` find the same header: names are matched without regard to capitals.

`Get` returns `""` both when a header is empty and when it is missing. To tell those apart, use `header.Values(name)`, which returns a slice of every value. A missing header gives an empty slice. The real `headerValue` uses that, then returns a pointer, so that "missing" can become `null` in JSON, as you saw in lesson 05.

## Your turn

Open `exercise.go` and finish:

1. `isRateLimited`, taking a status and headers
2. `headerValue`
3. `fetchStatus`, which makes a real request

```
go test ./07-calling-github
```

The test for `fetchStatus` starts a small web server on your own machine, calls it, then shuts it down and checks that you return an error. Nothing leaves your computer.

## You now know

- `http.Client`, and why it needs a `Timeout`
- `defer`
- The difference between an error and a bad status
- Reading headers

Next: [Lesson 08, testing](../08-testing/README.md).
