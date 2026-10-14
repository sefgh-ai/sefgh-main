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
| [04 Errors](04-errors/README.md) | Errors are ordinary values, not exceptions | `parseRequest` in `request.go` |
| [05 JSON](05-json/README.md) | Struct tags, `null` versus missing, pointers, and JSON whose shape you cannot trust | `rateLimit` and `errorResponse` in `backend/internal/githubsearch/handler.go`, and `DecodeJSON` in `backend/internal/jscompat/json.go` |
| [06 HTTP handlers](06-http-handlers/README.md) | Answering a request, interfaces, middleware | `ServeHTTP` in `handler.go`, and `backend/cmd/api/main.go` |
| [07 Calling GitHub](07-calling-github/README.md) | Making a request, timeouts, `defer` | The upstream call in `ServeHTTP`, and `isRateLimited` |
| [08 Testing](08-testing/README.md) | Table-driven tests, and how the contract fixtures work | `backend/internal/githubsearch/contract_test.go` |
| [09 Path parameters](09-path-parameters/README.md) | Named URL segments, router tests, URL compatibility | `backend/internal/githubrepos/handler.go`, `backend/internal/jscompat/fetchurl.go` |
| [10 Shared cache](10-shared-cache/README.md) | Mutexes, goroutines, completion channels and background refresh | `backend/internal/githubrepos/cache.go` |
| [11 Shared results](11-shared-results/README.md) | Waiting with `select`, cancellation, and preserving errors | `cacheFlight` in `cache.go`, upstream errors in `handler.go` |
| [12 Embedded data](12-embedded-data/README.md) | `go:embed`, blank imports and serving static JSON | `backend/internal/githublanguages/handler.go` |
| [13 Time and clocks](13-time-and-clocks/README.md) | Moments and time zones, moving by days, formatting dates, and passing the clock in so date logic can be tested | `dateRange` in `backend/internal/githubcontributions/dates.go`, and `Handler` in `handler.go` beside it |
| [14 Checking input](14-checking-input/README.md) | Regular expressions, allowlists against blocklists, and putting outside text into a URL safely | `backend/internal/githubrepos/identifiers.go` |
| [15 Settings from the environment](15-settings-from-the-environment/README.md) | Environment variables, handing a function to a function, and refusing a bad setting at start-up | `listenAddr` in `backend/cmd/api/main.go` |
| [16 Verifying access](16-verifying-access/README.md) | Middleware, online identity verification, deadlines and private cache isolation | `backend/internal/githubaccess/access.go` and `backend/cmd/api/main.go` |
| [17 Clocks and randomness](17-clocks-and-randomness/README.md) | Function injection, local calendar arithmetic, and how a recorded defect (a random "stars today") was replaced by a real measure | `backend/internal/githubtrending/handler.go` |
| [18 Bounded parallel work](18-bounded-parallel-work/README.md) | Goroutines, semaphore channels, WaitGroup and ordered results | `backend/internal/githubdevelopers/handler.go` |
| [19 Counting requests](19-counting-requests/README.md) | State shared by requests, locks, a clock you can pass in, and reading a POST body | `Limiter` in `backend/internal/ailimit/limit.go` |
| [20 Text as JavaScript counts it](20-text-as-javascript-counts-it/README.md) | Bytes, runes and UTF-16 units, cutting text where JavaScript cuts it, `MarshalJSON`, methods as values | `fallbackTitle` in `backend/internal/aichat/title.go`, `UTF16` in `backend/internal/jscompat/utf16.go` |
| [21 Wrapping every request](21-wrapping-every-request/README.md) | `http.RoundTripper`, cloning a request, remembering an answer for a while, and a URL that prints without its host | `Transport` in `backend/internal/publictoken/transport.go` |

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
- Check your lesson with `go vet ./...`, `go vet -tags solution ./...` and `go test -tags solution ./...`. All three must pass, and `gofmt -l .` must print nothing.
- An exercise must compile as shipped and fail its tests without panicking.
- Point at real code by file and function name, not line number. Line numbers go stale.
- Keep each lesson to one idea and about ten minutes of reading.
