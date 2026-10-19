# Lesson 37: Two copies kept in step

**You will learn:** how a Go test can read a file from outside the Go module to check that two copies of the same setting still agree, why `go test` runs in the package's own folder, and how to take a content security policy apart with `strings.Split` and `strings.Fields`.

**Real code:** `securityHeaders` in `backend/cmd/api/main.go`, `TestSecurityHeadersMatchNextConfig` in `backend/cmd/api/main_test.go`, and `securityHeaders` in `next.config.mjs`.

## The problem in the app

Every page and API reply from Next.js carries security headers, set in `next.config.mjs`. When Next.js forwards an API route to Go, it does not add them to Go's reply, so Go sends the same headers itself:

```go
// backend/cmd/api/main.go
var securityHeaders = map[string]string{
	"Content-Security-Policy": "default-src 'self'; ... connect-src 'self' https://*.supabase.co wss://*.supabase.co ...",
	"Referrer-Policy":         "strict-origin-when-cross-origin",
	// ...
}
```

Two copies of the same thing drift apart: someone changes one and forgets the other. In BUG-010 that is exactly what happened. The website's policy gained `wss://*.supabase.co`, because `https:` does not cover websockets and Supabase Realtime is one (bug register R-104). The Go copy did not, until a test said so:

```text
--- FAIL: TestSecurityHeadersMatchNextConfig (0.00s)
    main_test.go:42: next.config.mjs has a different value for Content-Security-Policy
```

## Reading a file the module does not own

```go
data, err := os.ReadFile(filepath.Join("..", "..", "..", "next.config.mjs"))
```

`go test` runs each package's tests **in that package's folder**, here `backend/cmd/api`. So a relative path in a test always starts from the same place, wherever you typed the command. Three folders up is the repository root, where `next.config.mjs` lives.

`filepath.Join` puts the parts together with the right separator for the system: `\` on Windows, `/` elsewhere. In JavaScript you would reach for `path.join` from `node:path`; it is the same idea.

A test that reads a file outside the module has one catch, which `AGENTS.md` mentions for `contracts/`: Go caches test results by the files *inside* the module. Change only `next.config.mjs` and `go test` may print a cached `ok`. Run it with `-count=1` to make it run again.

## A cheap check is enough

The test does not parse JavaScript. It checks that each Go value appears in the file, in quotes:

```go
for name, value := range securityHeaders {
	if !strings.Contains(config, `key: "`+name+`"`) {
		t.Errorf("next.config.mjs has no %s header", name)
	}
	if !strings.Contains(config, `"`+value+`"`) {
		t.Errorf("next.config.mjs has a different value for %s", name)
	}
}
```

And it counts the headers, so a header added on one side only is caught too:

```go
if got := strings.Count(config, "key: \""); got != len(securityHeaders) {
```

The backquotes make a raw string: no escapes inside, like a JavaScript template literal without `${}`. Ranging over a map visits the entries in no fixed order, which is fine here because every entry is checked.

## Taking a policy apart

A policy is a list of directives separated by `;`, each a name followed by its sources:

```text
script-src 'self' https:; connect-src 'self' wss://*.supabase.co
```

`strings.Split(policy, ";")` gives the directives. `strings.Fields(directive)` splits one at any run of spaces and drops empty pieces, so `" connect-src 'self'  wss://x "` becomes `["connect-src", "'self'", "wss://x"]`. In JavaScript that would be `s.trim().split(/\s+/)`.

The website's own guard, `scripts/contracts/csp.test.mjs`, takes the policy apart this way and then asks whether Realtime's address is allowed.

## Your turn

Open `exercise.go` and write `sources`, which gives the sources of one directive.

```text
go test ./37-two-copies-kept-in-step
go test -tags solution ./37-two-copies-kept-in-step
```

## You now know

- A test can check that two copies of a setting agree, even when one lives outside Go.
- `go test` runs in the package's folder, so relative paths in tests are stable; `-count=1` reruns a test whose input is outside the module.
- `strings.Contains` and `strings.Count` are often enough; parsing is not always needed.
- `strings.Split` cuts at a separator; `strings.Fields` cuts at whitespace and drops the empty pieces.
