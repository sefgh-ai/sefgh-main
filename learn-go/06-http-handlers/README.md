# Lesson 06: HTTP handlers

**You will learn:** how a Go program answers a web request, what an interface is, and what "middleware" means.

**Real code:** `Handler` and `ServeHTTP` in `backend/internal/githubsearch/handler.go`, and the server in `backend/cmd/api/main.go`.

## The same job in two languages

A Next.js route handler receives a request and **returns** a response:

```js
export async function GET(request) {
  return NextResponse.json({ error: "Search query is required" }, { status: 400 });
}
```

A Go handler receives a request and a writer, and **writes** the response into the writer:

```go
func ping(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	io.WriteString(w, `{"status":"ok"}`)
}
```

`r` is the request: the URL, the headers, the body. `w` is where the answer goes.

**Order matters.** Set headers first, then the status with `WriteHeader`, then the body. The status and headers are sent the moment you write the status or the first byte of the body, and after that they cannot change. If you never call `WriteHeader`, the status is 200.

Text inside backticks, like `` `{"status":"ok"}` `` above, is a **raw string**. It can contain double quotes without any escaping, which makes it handy for JSON.

## Methods

So far every function stood alone. A **method** is a function attached to a type. The real handler is a struct with settings, and a method that uses them:

```go
type Handler struct {
	Client  *http.Client
	BaseURL string
	Token   string
	Logger  *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// ... uses h.Token, h.BaseURL ...
}
```

`(h *Handler)` before the name is the **receiver**. Inside the method, `h` plays the part that `this` plays in JavaScript, except that you choose its name and it is always written out.

## Interfaces

Go's web server will send requests to anything that has this one method:

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

An **interface** is a list of methods. Any type that has those methods fits the interface automatically. You never write "implements". Our `Handler` struct has a `ServeHTTP` method with the right shape, so the server accepts it.

A plain function has no methods, so it does not fit by itself. `http.HandlerFunc(ping)` wraps a function so that it does.

## Routes

`backend/cmd/api/main.go` connects URLs to handlers:

```go
mux := http.NewServeMux()
mux.Handle("GET /api/github/search", &githubsearch.Handler{ ... })
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { ... })
```

`mux` is short for multiplexer: the piece that looks at each request and picks a handler. The pattern says both the method and the path. A `POST` to the search path gets a 405 reply without any code from us.

## Middleware

Middleware is a handler that wraps another handler: it does something, then passes the request on. The real server uses one to label every response. This is a shortened copy; the real one also adds the site's security headers:

```go
func markBackend(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Sefgh-Backend", "go")
		next.ServeHTTP(w, r)
	})
}
```

It takes a handler and returns a new one. That label is how you can tell, from the browser's network tab, whether Go or Next.js answered a request.

## One difference from the real handler

In this exercise you read the query string with `r.URL.Query().Get("name")`. That is the normal Go way, and it is right for new code.

The real search handler does **not** use it. Go and browsers disagree about a few odd query strings, such as a `%` that is not followed by two hex digits. The contract was recorded from the JavaScript behaviour, so the handler uses `jscompat.ParseQuery`, written to match. When you port existing behaviour, matching the old program beats doing it the usual way.

## Your turn

Open `exercise.go` and finish:

1. `ping`
2. `greet`, which answers 200 or 400. Build its JSON with `encoding/json`. A map works well: `map[string]string{"message": "..."}`.
3. `withHeader`, a middleware

```
go test ./06-http-handlers
```

The tests call your handlers directly with a fake request and a recorder, using Go's `httptest` package. No server starts and no port opens.

## See the real thing run

From the `backend` folder:

```
go run ./cmd/api
```

Then in a second terminal:

```
curl.exe -i "http://127.0.0.1:8787/healthz"
curl.exe -i "http://127.0.0.1:8787/api/github/search?q=%20"
curl.exe "http://127.0.0.1:8787/api/github/search?q=react&per_page=1"
```

The first two print the reply's headers; look for `X-Sefgh-Backend: go`. The second sends a blank query, so you get the 400 from lesson 04. The third is a real search through GitHub. Stop the server with Ctrl+C.

Type `curl.exe`, not `curl`: in PowerShell, plain `curl` is a different command.

## You now know

- `http.ResponseWriter` and `*http.Request`
- Methods and receivers
- Interfaces, and that types fit them automatically
- Routes and middleware

Next: [Lesson 07, calling GitHub](../07-calling-github/README.md).
