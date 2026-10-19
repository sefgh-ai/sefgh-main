# Lesson 36: A policy proxy

**You will learn:** how one Go handler can carry the browser's database calls for many areas at once, passing each request on unchanged after checking it against a list of rules. You will meet `go:embed`, the `{rest...}` wildcard, how to forward a request without changing it, and why the refusal is written in the database's own error shape.

**Real code:** `backend/internal/dataproxy/handler.go` and `policy.json`, and `src/lib/supabase/data-routing.js`.

## The problem in the app

Lessons 34 and 35 moved two areas of the browser's database calls behind Go, each with its own endpoints. Eight areas were left: notifications, profile, conversations and more, about forty call sites. Writing a Go endpoint for each one would take a long time. The owner chose another way: the browser keeps making the same Supabase calls, but its client sends them to Go, and Go passes each one on to the database after checking it.

```js
// src/lib/supabase/client.js
return createBrowserClient(url, key, { global: { fetch: routedFetch(url) } });
```

`routedFetch` looks at each request. A Data API request for a table whose area is switched on goes to `/api/data/{area}/rest/v1/...` on this site instead; everything else goes to Supabase as before.

## The rules, embedded

What each area may do is written in `policy.json`: its tables, the methods allowed on each, and which fields a write may set. Go reads the file into the program when it is built:

```go
//go:embed policy.json
var policyJSON []byte
```

`go:embed` is a comment the compiler reads. The file becomes part of the binary, so the server never has to find it on disk. The browser keeps its own copy of the area list, and a test checks the two agree.

## Matching the rest of the path

```go
mux.Handle("/api/data/{area}/rest/v1/{rest...}", h)
```

`{rest...}` matches everything after `/rest/v1/`, slashes included. `r.PathValue("rest")` gives it back **decoded**. For checking the table name that is what we want. For forwarding we take the path as it was sent, `r.URL.EscapedPath()`, so a value that was percent-encoded stays encoded.

## Forwarding without changing

```go
req, err := http.NewRequestWithContext(ctx, r.Method, upstream, bytes.NewReader(body))
for _, name := range forwarded {
	if value := r.Header.Get(name); value != "" {
		req.Header.Set(name, value)
	}
}
```

Only the headers the Data API reads are copied: `Accept`, `Prefer`, `Content-Type` and a few more. The caller's own token goes along unchanged, so row-level security sees the same user the browser was. The `apikey` is always the server's own public key. The reply comes back with its status, its body and the `Content-Range` header that counts read. `io.LimitReader` keeps a huge reply from filling memory, as in lesson 31.

## Saying no in the right shape

A refused request gets a 403 that looks like the database's own error:

```json
{"code":"42501","details":null,"hint":null,"message":"user_stats.xp cannot be written for user-stats"}
```

supabase-js then hands the browser code an `error` exactly as if the database had refused, and the code's existing error handling does the rest. Here the rules close a real gap: through Go, nobody can set their own XP (R-103).

## Logs without secrets

The first version logged the transport's error text, and a test caught it: Go's errors include the request's URL, and the URL holds the query, ids included. The log now uses `supabaserest.Describe`, which says only "transport" or "timeout".

## Your turn

Open `exercise.go` and write `targetOf`, which finds the table or function a Data API path names.

```text
go test ./36-a-policy-proxy
go test -tags solution ./36-a-policy-proxy
```

## You now know

- `go:embed` puts a file into the binary.
- `{rest...}` matches the rest of a path; `PathValue` decodes it, `EscapedPath` does not.
- A proxy copies only the headers that matter and keeps the caller's own token.
- A refusal in the library's own error shape lets existing error handling work unchanged.
