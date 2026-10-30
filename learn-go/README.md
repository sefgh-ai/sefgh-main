# Learn Go with SEFGH

SEFGH's backend is moving from Next.js to Go, one route at a time. This folder teaches you Go as that happens. Every lesson explains one Go idea using code that really runs in `backend/`, then gives you a small piece to write yourself.

You already know JavaScript, so the lessons compare the two where it helps.

## Before you start

Go 1.27.2 is installed on this machine. Open a **new** terminal and check:

```
go version
```

You should see `go version go1.27.2 windows/amd64`. If the terminal says `go` is not recognized, close VS Code completely and open it again: programs only see a new install after they restart.

In VS Code, install the extension named **Go** (by the Go Team at Google). It formats your code on save, adds missing imports for you, and shows mistakes as you type.

## How a lesson works

Each lesson is a folder. Do them in order.

| File | What it is |
|---|---|
| `README.md` | The lesson. Read this first |
| `exercise.go` | Your part. It has `TODO` gaps for you to fill |
| `exercise_test.go` | Tests that tell you whether your code is right |
| `solution.go` | A finished answer. Try first, then compare |

Run every command from this `learn-go` folder. To check your work on lesson 01:

```
go test ./01-values-and-functions
```

The tests fail until you finish the exercise. That is how you know there is something left to do. `ok` means you are done.

If you get stuck, see the finished answer pass, then read it:

```
go test -tags solution ./01-values-and-functions
```

`-tags solution` tells Go to use `solution.go` in place of your `exercise.go`.

## The lessons

Lessons 01 to 08 walk through the first route that moved to Go: `GET /api/github/search`. By the end you can read every line of it.

| Lesson | You learn | Real code it is built on |
|---|---|---|
| [00 Hello](00-hello/README.md) | Running, testing and formatting a Go program | None yet |
| [01 Values and functions](01-values-and-functions/README.md) | Types, variables, constants, functions, `if` | `clamp` and `valueOr` in `backend/internal/githubsearch/request.go` |
| [02 Structs and maps](02-structs-and-maps/README.md) | Grouping data, looking things up, the "comma ok" form | `sortOptions` in the same file |
| [03 Strings and bytes](03-strings-and-bytes/README.md) | What a string really is, loops, building text | `EncodeURIComponent` in `backend/internal/jscompat/jscompat.go` |
| [04 Errors](04-errors/README.md) | Errors are ordinary values, not exceptions; a clock passed in for fixed UTC search periods (BUG-039) | `parseRequest` in `request.go` |
| [05 JSON](05-json/README.md) | Struct tags, `null` versus missing, pointers, and JSON whose shape you cannot trust | `rateLimit` and `errorResponse` in `backend/internal/githubsearch/handler.go`, and `DecodeJSON` in `backend/internal/jscompat/json.go` |
| [06 HTTP handlers](06-http-handlers/README.md) | Answering a request, interfaces, middleware | `ServeHTTP` in `handler.go`, and `backend/cmd/api/main.go` |
| [07 Calling GitHub](07-calling-github/README.md) | Making a request, timeouts, `defer` | The upstream call in `ServeHTTP`, and `isRateLimited` |
| [08 Testing](08-testing/README.md) | Table-driven tests, and how the contract fixtures work | `backend/internal/githubsearch/contract_test.go` |
| [09 Path parameters](09-path-parameters/README.md) | Named URL segments, router tests, URL compatibility | `backend/internal/githubrepos/handler.go`, `backend/internal/jscompat/fetchurl.go` |
| [10 Shared cache](10-shared-cache/README.md) | Mutexes, goroutines, completion channels and background refresh | `backend/internal/githubrepos/cache.go` |
| [11 Shared results](11-shared-results/README.md) | Waiting with `select`, cancellation, and preserving errors | `cacheFlight` in `cache.go`, upstream errors in `handler.go` |
| [12 Embedded data](12-embedded-data/README.md) | `go:embed`, blank imports, serving static JSON and a private catalog lookup set (BUG-040) | `backend/internal/githublanguages/handler.go` |
| [13 Time and clocks](13-time-and-clocks/README.md) | Moments and time zones, moving by days, formatting dates, and passing the clock in so date logic can be tested | `dateRange` in `backend/internal/githubcontributions/dates.go`, and `Handler` in `handler.go` beside it |
| [14 Checking input](14-checking-input/README.md) | Regular expressions, allowlists against blocklists, and putting outside text into a URL safely | `backend/internal/githubrepos/identifiers.go` |
| [15 Settings from the environment](15-settings-from-the-environment/README.md) | Environment variables, handing a function to a function, and refusing a bad setting at start-up | `listenAddr` in `backend/cmd/api/main.go` |
| [16 Verifying access](16-verifying-access/README.md) | Middleware, online identity verification, deadlines and private cache isolation | `backend/internal/githubaccess/access.go` and `backend/cmd/api/main.go` |
| [17 Clocks and randomness](17-clocks-and-randomness/README.md) | Function injection, elapsed UTC days (BUG-041), catalog language quoting (BUG-040), shared rate-limit replies and nullable headers (BUG-042), safe colour maps and C++ query decoding (BUG-043), and replacing random "stars today" with a real measure | `backend/internal/githubtrending/handler.go`, `backend/internal/githublimit/response.go` |
| [18 Bounded parallel work](18-bounded-parallel-work/README.md) | Goroutines, semaphore channels, WaitGroup, ordered results, fixed UTC windows (BUG-041), returning HTTP headers with data (BUG-042), and keeping usable results alongside errors (BUG-044) | `backend/internal/githubdevelopers/handler.go` |
| [19 Counting requests](19-counting-requests/README.md) | State shared by requests, locks, a clock you can pass in, and reading a POST body | `Limiter` in `backend/internal/ailimit/limit.go` |
| [20 Text as JavaScript counts it](20-text-as-javascript-counts-it/README.md) | Bytes, runes and UTF-16 units, cutting text where JavaScript cuts it, `MarshalJSON`, methods as values | `fallbackTitle` in `backend/internal/aichat/title.go`, `UTF16` in `backend/internal/jscompat/utf16.go` |
| [21 Wrapping every request](21-wrapping-every-request/README.md) | `http.RoundTripper`, cloning a request, remembering an answer for a while, and a URL that prints without its host | `Transport` in `backend/internal/publictoken/transport.go` |
| [22 Reading rows as the user](22-reading-rows-as-the-user/README.md) | Asking the database with the user's own token, paging with one deadline (BUG-038), several return values, encoding a value for a URL, rounding exactly with `math/big`, and testing Go against the JavaScript it replaces with `os/exec` | `backend/internal/activity`, `ToFixed` in `backend/internal/jscompat/tofixed.go` |
| [23 Passing JSON through untouched](23-passing-json-through/README.md) | `json.RawMessage`, reading an object one token at a time, packages and capitalised names, one deadline for a group of goroutines | `backend/internal/starred`, `backend/internal/jscompat/rawjson.go`, `backend/internal/supabaserest` |
| [24 Optional sign-in, and a URL that matches byte for byte](24-optional-sign-in/README.md) | Method and wildcard route patterns, `r.PathValue`, "value, ok" pairs and `strings.CutPrefix`, two URL encoders that disagree, a `switch` with no value | `backend/internal/sharetoken`, `FormEncode` in `backend/internal/jscompat/jscompat.go`, `backend/internal/supabaserest` |
| [25 Writing to the database as the user](25-writing-as-the-user/README.md) | Sending a request with a body, writes that go with the user's own token, JavaScript's `||` defaults, a type switch, copying `.some()` exactly | `backend/internal/collect`, `Insert` and `Delete` in `backend/internal/supabaserest`, `backend/internal/jscompat/tostring.go` |
| [26 Three kinds of nothing, and one deadline for several calls](26-three-kinds-of-nothing/README.md) | `undefined`, `null` and falsy values, a `nil` `json.RawMessage`, optional fixture reply slices (BUG-037), one `context.WithTimeout` over calls in a row, a clock passed in, sharing helpers in `jscompat` | `backend/internal/vote`, `backend/internal/jscompat/request.go`, `backend/cmd/api/main_test.go` |
| [27 When text meets numbers](27-when-text-meets-numbers/README.md) | JavaScript's comparisons and `+` with text, NaN in a range check, three ways to round, checking a number's shape before parsing it | `backend/internal/rating`, `backend/internal/jscompat/number.go` |
| [28 Many lookups at once, one failure for all](28-many-at-once-one-failure-for-all/README.md) | Bounded goroutines with one deadline, cancelling the rest on the first failure (`Promise.all`), `HEAD` and a count header, `parseInt` against `Number`, testing requests in any order | `backend/internal/comments`, `backend/internal/supabaserest`, `backend/internal/jscompat/parseint.go` |
| [29 A JavaScript pattern in Go](29-a-javascript-pattern-in-go/README.md) | Where Go's `\s` and `.` differ from JavaScript's, patterns that count UTF-16 units, byte offsets from `regexp`, `includes` on text and on a list | `backend/internal/videos`, `backend/internal/jscompat/regexp.go` |
| [30 Defaults, fallbacks and values that vanish](30-defaults-and-missing-values/README.md) | Destructuring defaults against `||`, `undefined` fields that JSON leaves out, `slice(-50)` without negative indexes, error text that reaches the browser | `backend/internal/shares`, `ErrorMessage` in `backend/internal/supabaserest` |
| [31 Bounded file streams](31-bounded-file-streams/README.md) | Multipart parts, readers, reading one extra byte, shared deadlines and bounded cleanup | `readAvatar` and `Handler.call` in `backend/internal/avatar/handler.go` |
| [32 Request budgets and redirects](32-request-budgets-and-redirects/README.md) | One context for the whole request, connection read deadlines, copying clients and confining provider credentials | `ailimit.BoundRequest`, `aiprovider.Client.Generate`, `aienhance.Handler.post` |
| [33 Partial answers and shared caches](33-partial-answers-and-shared-caches/README.md) | `sync.WaitGroup.Go`, keeping the searches that worked, `max-age` against `s-maxage` and `no-store`, never caching who asked, sharing one mapping across packages | `backend/internal/trendingtopics`, `Item` in `backend/internal/githubtrending` |
| [34 A browser call moves to the server](34-a-browser-call-moves-to-the-server/README.md) | Moving a browser database call behind Go with a fallback, never trusting an id from the client, `ServeMux` precedence between a fixed path and a wildcard, closures and method values as middleware | `backend/internal/searchhistory`, `src/lib/supabase/search-history.js`, `src/lib/go-data.js` |
| [35 Answering the library's own result](35-answering-the-librarys-own-result/README.md) | Answering supabase-js's `{ data, error }` so the code around a call stays the same, a reference implementation for expected answers, a `map[string]bool` as a set, why field rules belong on the server | `backend/internal/onboarding`, `Result` in `backend/internal/supabaserest`, `src/lib/go-data.js` |
| [36 A policy proxy](36-a-policy-proxy/README.md) | `go:embed`, the `{rest...}` wildcard, forwarding a request unchanged with chosen headers, refusing in the library's own error shape, logs without URLs | `backend/internal/dataproxy`, `src/lib/supabase/data-routing.js` |
| [37 Two copies kept in step](37-two-copies-kept-in-step/README.md) | A test that checks two copies of a setting agree, reading a file outside the module from a test, `-count=1`, raw strings, `strings.Split` and `strings.Fields` | `securityHeaders` and `TestSecurityHeadersMatchNextConfig` in `backend/cmd/api`, `next.config.mjs` |
| [38 Confining proxied requests](38-confining-proxied-requests/README.md) | Schema-selection headers, checking repeated values, copying an HTTP client to refuse redirects, and bounding identity/body/database time together | `backend/internal/dataproxy`, `BoundRequest` in `backend/internal/supabaserest/request.go` |
| [39 Comparing frozen search runs](39-comparing-frozen-search-runs/README.md) | Comparable structs, maps as sets, float division, strict JSON and testing CLI exit codes | `backend/internal/searchparity`, `backend/cmd/searchparity` |
| [40 Secret handles and capabilities](40-secret-handles-and-capabilities/README.md) | Private fields, explicit one-time access, interfaces as capabilities and safe formatting | `backend/internal/apikey/material.go`, `lifecycle.go` |
| [41 HTTP boundaries](41-http-capabilities-and-buffered-replies/README.md) | Verified capability factories, strict JSON names, bounded response buffering, and I/O versus context deadlines | `backend/internal/apikey/http.go` and `http_search.go` |
| [42 RPC capabilities and database authority](42-rpc-capabilities-and-database-authority/README.md) | Bound user tokens, separate accounting capabilities, strict replies and database-owned admission | `backend/internal/apikey/rpc.go`, `rpc_accounting.go`, `rpc_json.go` |
| [43 Atomic test counters](43-atomic-test-counters/README.md) | Goroutines in HTTP tests, atomic Add/Load and waiting for workers | `TestRPCNoRetryNoErrorPayloadAndNoCredentialRedirect` in `backend/internal/apikey/rpc_edges_test.go` |
| [44 Bounded receipt recovery](44-bounded-receipt-recovery/README.md) | Narrow concrete capabilities, opening recovery with admissions disabled, context budgets, partial progress and retry cursors | `RecoverCompletionPage` and `RPCClient.OpenRecovery` in `backend/internal/apikey` |
| [45 Copying JavaScript's string rules](45-copying-javascript-string-rules/README.md) | One-pass `ReplaceAll` against a regular expression's runs, `TrimPrefix` against `Trim`, and why `Part.FileName()` is not the name that was sent | `readAvatar` and `cleanPath` in `backend/internal/avatar/handler.go` |
| [46 Porting a Python worker](46-porting-a-python-worker/README.md) | Recording the original against fakes, injected clocks and sleeps, an `atomic.Bool` stop flag, and why Go times always have a zone | `Config`, `Worker.Stop` and `handleRateLimit` in `backend/internal/reposync`; `backend/cmd/reposync` |
| [47 Wiring gated routes](47-wiring-gated-routes/README.md) | Exact opt-in, composing narrow capabilities, startup versus request budgets, and testing the production mux and forwarding path | `backend/cmd/api/keys.go`, `next.config.mjs` |
| [47 Sharing code between routes](47-sharing-code-between-routes/README.md) | Moving a function into its own package, exported names without stutter, `internal` imports, why Go refuses import cycles, and strict `false` on raw JSON | `Read` and `Handler` in `backend/internal/publicrepo`; `publicRepoMux` in `backend/cmd/api/main.go` |

Two lessons end with a **real task**: a small change to the actual app, guarded by the same tests the rest of the project uses.

- Lesson 02: fix the navbar's "Most Stars" button, which currently does nothing.
- Lesson 08: add a missing case to the search contract.

## Commands you will use all the time

| Command | What it does |
|---|---|
| `go run ./00-hello` | Compile and run a program |
| `go test ./04-errors` | Run one lesson's tests |
| `go test -v ./04-errors` | The same, listing every test by name |
| `go test -run TestParsePage ./04-errors` | Run only the tests whose name matches |
| `gofmt -w .` | Format every file the standard way |
| `go vet ./...` | Look for likely mistakes |
| `go doc strings.Builder` | Read the documentation for anything |

`./...` means "this folder and every folder inside it".

## How this folder grows

Whenever Codex or Claude adds Go code to `backend/`, they add or update a lesson here in the same piece of work. That rule is written in `AGENTS.md` at the top of the repository. New lessons take the next number.

Your `exercise.go` files are yours. The agents are told not to change them.

## For Codex and Claude

- `go test ./...` here fails by design until the owner completes the exercises. It is not a regression.
- Owner policy (2026-10-21): generate/update lessons with backend work and keep the work lightweight. Lesson tests/vet/build are optional; avoid repeating them during migration. Default handoff/CI skips lesson checks explicitly. Use `npm run handoff -- --lessons` from the repository root, or the manual CI `verify_lessons` option, when solution verification is requested. Skipped checks are not reported as passes. Application/backend tests remain required.
- An exercise must compile as shipped and fail its tests without panicking.
- Point at real code by file and function name, not line number. Line numbers go stale.
- Keep each lesson to one idea and about ten minutes of reading.
