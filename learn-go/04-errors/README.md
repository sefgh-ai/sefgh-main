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
search, err := parseRequest(r.URL.RawQuery)
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

## Your turn

Open `exercise.go` and write `parsePage`. The comment above it lists what each input should give.

```
go test ./04-errors
```

Get `TestParsePage` passing first. Then try `TestParsePageStretch`, which has two harder cases:

- `strconv.Atoi` accepts `"+5"`. Our API does not. A library's rule and your rule are not always the same, so sometimes you check something yourself first.
- A number with 26 digits does not fit in an `int`. `Atoi` reports that with a specific error, `strconv.ErrRange`, and still returns the biggest number it can hold. Use `errors.Is` to treat that one error differently from the rest.

## You now know

- Functions return errors; nothing is thrown
- `if err != nil`
- `errors.New`, `errors.Is`, and wrapping with `%w`

Next: [Lesson 05, JSON](../05-json/README.md).
