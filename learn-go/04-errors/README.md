# Lesson 04: Errors

**You will learn:** how Go reports that something went wrong. There is no `try` and no `catch`.

**Real code:** `parseRequest` in `backend/internal/githubsearch/request.go`, and how `ServeHTTP` in `handler.go` uses it.

## The problem in the app

`page=abc` is not a page number. The handler has to notice and answer with status 400 and a message, without calling GitHub at all.

## Errors are values

In JavaScript a function that fails **throws**, and some `catch` block, maybe far away, deals with it. The whole Next.js handler sits inside one big `try { ... } catch`.

In Go a function that can fail **returns** the failure, as an ordinary second value:

```go
n, err := strconv.Atoi("42")    // n is 42,  err is nil
n, err := strconv.Atoi("abc")   // n is 0,   err describes the problem
```

`nil` means "nothing". An `err` of `nil` means it worked. So after almost every call that can fail, you will see these three lines:

```go
if err != nil {
	return 0, err
}
```

This looks repetitive at first. The benefit is that you can see every place a function may stop early, just by reading it top to bottom.

## Returning two values

A Go function can return more than one value. The error is always last:

```go
func parsePage(s string) (int, error) {
```

On success return the answer and `nil`. On failure return the zero value and the error.

## Making your own error

```go
var errInvalidPage = errors.New("page must be a whole number")
```

An error created once and reused like this is called a **sentinel error**. Other code can ask "is it that one?":

```go
if errors.Is(err, errInvalidPage) {
```

Use `errors.Is`, not `==`. An error is often wrapped inside another one that adds detail, and `errors.Is` looks inside the wrapping.

## How the real handler uses this

`parseRequest` checks everything about the request and returns one of two sentinel errors:

```go
var (
	errMissingQuery      = errors.New("Search query is required")
	errInvalidParameters = errors.New("Invalid search parameters")
)
```

The handler turns either one into a 400 reply, using the error's text as the message:

```go
search, err := parseRequest(r.URL.RawQuery, now())
if err != nil {
	writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
	return
}
```

Further down, when the call to GitHub fails, the handler adds context before logging:

```go
h.fail(w, r, fmt.Errorf("calling GitHub: %w", err))
```

`%w` wraps the original error inside a new one with a clearer message. The log then says what the program was doing as well as what went wrong.

## Ignoring an error on purpose

Look at the real `clamp`:

```go
n, _ := strconv.ParseInt(s, 10, 64)
```

The `_` throws the error away. That is normally a mistake, so the comment above the function explains why it is safe here: the text was already checked to be digits, so the only possible failure is "too big", and in that case `ParseInt` returns the largest number it can, which `clamp` then limits anyway. Ignoring an error is allowed. Ignoring one without saying why is not.

## A clock is an input too (BUG-039, R-016)

Monthly and yearly search now mean repositories created in the last 30 or 365 days. `parseRequest` accepts a `time.Time` alongside the query string. The handler supplies the clock: its `Now func() time.Time` field defaults to `time.Now`, and a test supplies a fixed instant. In JavaScript this is the same idea as passing `now = () => new Date()` into a function instead of reading the real clock deep inside it.

```go
from := now.UTC().Add(-time.Duration(days) * 24 * time.Hour)
query += " created:>" + from.Format(time.RFC3339)
```

`time.Duration` measures elapsed time. This subtracts exactly 30 or 365 days, rather than changing a calendar month or year, so leap days and daylight saving do not change the duration. `UTC()` makes the output independent of the clock's offset. The full timestamp matters: GitHub treats a plain `created:>DATE` as after that entire day (R-203).

Small exercise, separate from your existing `exercise.go`: work out the start for `2024-03-01T12:00:00Z` minus 365 days. It is `2023-03-02T12:00:00Z`, since 2024 includes February 29. `yearly-across-leap-day` checks this in memory and over HTTP; the two monthly offset cases check that the same instant produces the same URL.

## Your turn

Open `exercise.go` and write `parsePage`. The comment above it lists what each input should give.

```
go test ./04-errors
```

Get `TestParsePage` passing first. Then try `TestParsePageStretch`, which has two harder cases:

- `strconv.Atoi` accepts `"+5"`. Our API does not. A library's rule and your rule are not always the same, so sometimes you check something yourself first.
- A number with 26 digits does not fit in an `int`. `Atoi` reports that with a specific error, `strconv.ErrRange`, and still returns the biggest number it can hold. Use `errors.Is` to treat that one error differently from the rest.

## Four more filters, one refusal (R-017)

On 2026-10-28 the search learned the navbar's filters GitHub understands: `license`, `created`, `topic` and `forks`. `parseRequest` in `backend/internal/githubsearch/request.go` checks them the same way it checks `stars`, and folds every check into one boolean so there is still a single place that answers `errInvalidParameters`:

```go
var topics []string
if topicList != "" {
	topics = strings.Split(topicList, ",")
}
validFilters := (license == "" || licensePattern.MatchString(license)) &&
	(created == "" || createdPattern.MatchString(created)) &&
	(forks == "" || starsPattern.MatchString(forks)) &&
	len(topics) <= maxTopics
for _, topic := range topics {
	validFilters = validFilters && topicPattern.MatchString(topic)
}
```

`strings.Split("web,cli", ",")` is JavaScript's `"web,cli".split(",")`. One difference to remember: in Go, splitting an empty string gives a list with one empty string, `[""]`, just as in JavaScript; that is why the code only splits when `topicList` is not empty.

The browser turns "Past week" into `created=>=2026-10-21` itself (`src/lib/search/advanced-filters.js`), so the server needs no clock and the contract stays exact. Its test, `scripts/contracts/advanced-filters.test.mjs`, reads `licensePattern` and the others straight out of this Go file and checks every value the browser can send against them, so the two sides cannot drift apart.

## You now know

- Functions return errors; nothing is thrown
- `if err != nil`
- `errors.New`, `errors.Is`, and wrapping with `%w`

Next: [Lesson 05, JSON](../05-json/README.md).
