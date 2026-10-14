# Lesson 21: Wrapping every request

**You will learn:** what really sends an HTTP request in Go, how to change every request a program makes in one place, why you copy a request before changing it, and a surprise in how Go prints some URLs.

**Real code:** `Transport` in `backend/internal/publictoken/transport.go`, and `githubMux` in `backend/cmd/api/main.go`.

## The problem in the app

When a visitor is signed out, the server reads GitHub with no token. GitHub then allows 60 requests an hour for the server's whole address, shared by every signed-out visitor. You approved a server token for these reads on one condition: it may read only public data.

Six handlers read GitHub for signed-out visitors. Changing each one would be six chances to get it wrong. Go lets us make the change once, underneath all of them.

## Who actually sends a request

Every handler sends with an `http.Client`:

```go
resp, err := client.Do(req)
```

The client handles timeouts and redirects. It does not talk to the network itself. It hands each request to its `Transport`, which is any value with this one method:

```go
type RoundTripper interface {
	RoundTrip(*http.Request) (*http.Response, error)
}
```

That is `http.RoundTripper`. One request goes in, one response comes out: a round trip. If a client has no `Transport`, it uses `http.DefaultTransport`, which really opens connections.

So we can write our own type with a `RoundTrip` method, have it change the request, and pass it on to the real transport. The handlers never notice. In `main.go`:

```go
client := &http.Client{Timeout: githubsearch.DefaultTimeout, Transport: transport}
```

Only the signed-out handlers are given the public token's transport. The handlers built for a signed-in caller get `nil`, which means the default, so a caller's own token can never be mixed up with the server's.

In JavaScript you would wrap `fetch` instead, and the Next.js side does exactly that: `publicGitHubFetch` in `src/lib/github/public-token.js`. The difference is that in JavaScript every call site has to call the wrapper. In Go the wrapper sits inside the client, so the call sites stay as they were.

## Copy before you change

The rules for `RoundTrip` say it must not change the request it is given. The caller still owns that request and may look at it again. So the token goes on a copy:

```go
withToken := req.Clone(req.Context())
withToken.Header.Set("Authorization", "Bearer "+t.Token)
resp, err := t.base().RoundTrip(withToken)
```

`Clone` copies the headers, so setting one on the copy leaves the original alone. It does **not** copy the body. That matters here: if GitHub's reply shows the token is unsafe, the transport throws the reply away and sends the original request again without the token. A body can be read only once, so the transport gives the token only to GET requests, which have no body.

## Remembering an answer for a while

Before the token is used, GitHub is asked what it may do: `GET /user` must come back with an empty `X-OAuth-Scopes` header. Asking before every request would double the traffic, so the answer is kept for ten minutes, or for one minute if it was "no":

```go
if t.now().Before(t.until) {
	return t.usable
}
```

Many requests can arrive at once, each in its own goroutine. One of them does the check. The others wait for that answer instead of asking again, by waiting for a channel to close:

```go
case <-done:
	continue
```

Closing a channel wakes everyone who is waiting on it, which is what makes it a good "this is finished" signal. Lesson 11 used the same idea.

## The surprise: a URL that prints without its host

The first version of this transport did not work for the repository routes. The test that runs the whole server caught it. The cause was this line:

```go
Origin(req.URL.String()) != t.Origin
```

The repository handlers build their URLs with `jscompat.FetchURL`, which keeps the path exactly as JavaScript would send it by storing it in a field called `Opaque`. When a URL has `Opaque` set, `String()` writes `https:/repos/o/r`: the host is gone. Parsing that again gives no origin at all, so the token was never added.

The fix reads the fields themselves instead of printing and reparsing:

```go
func originOf(u *url.URL) string {
	if u.Scheme == "" || u.Host == "" {
		return ""
	}
	...
}
```

The lesson behind the bug: a test that checks a piece on its own passed. Only the test that ran the real server, with the real handlers building their real URLs, found it.

## Your turn

Open `exercise.go` and write `RoundTrip` for `agentTransport`. It is a small cousin of the real one: it adds a `User-Agent` header when the request has none.

1. If `req` already has a `User-Agent`, pass `req` to `t.Base` unchanged.
2. Otherwise clone the request, set `User-Agent` on the clone to `t.Agent`, and pass the clone to `t.Base`.
3. Count every request in `t.sent`, whichever way it went.

```text
go test ./21-wrapping-every-request
go test -tags solution ./21-wrapping-every-request
```

One test checks that the caller's own request is unchanged afterwards. If you set the header on `req` instead of a clone, that test tells you.

## You now know

- `http.Client` hands every request to its `Transport`, an `http.RoundTripper`.
- Wrapping the transport changes every request a client makes, and the handlers do not change at all.
- `RoundTrip` must not change its request: clone it. `Clone` copies headers but not the body.
- A closed channel wakes every goroutine waiting on it.
- `url.URL.String()` of a URL with `Opaque` set leaves out the host. Read `Scheme` and `Host` instead.
