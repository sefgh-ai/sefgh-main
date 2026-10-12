# Lesson 01: Values and functions

**You will learn:** types, variables, constants, and how to write small functions.

**Real code:** `clamp` and `valueOr` in `backend/internal/githubsearch/request.go`.

## The problem in the app

A search request can ask for any page: `page=2`, `page=0`, `page=99999`. GitHub exposes only the first 1000 search results; the last usable page depends on page size. Our handler applies a coarse page bound of 1 to 1000, which does not guarantee GitHub accepts every page. Squeezing a number into a range is called *clamping*.

The Next.js handler does it like this:

```js
const safePage = Math.min(MAX_PAGE, Math.max(1, Number(page)));
```

The Go handler has a function for it:

```go
func clamp(s string, lo, hi int64) int64 {
	n, _ := strconv.ParseInt(s, 10, 64)
	return min(max(n, lo), hi)
}
```

The real one starts from text, because that is what arrives in a URL. Turning text into a number is lesson 04. In this lesson your `clamp` starts from a number.

## Variables

```go
var page int = 2     // the long form
perPage := 30        // the short form: Go works out the type
```

`:=` means "create a new variable". It only works inside a function. Plain `=` changes a variable that already exists.

Once a variable has a type, it keeps it. This does not compile:

```go
perPage := 30
perPage = "thirty"   // error: a string is not an int
```

## Types you will meet first

| Type | Holds | Its zero value |
|---|---|---|
| `string` | text | `""` |
| `int` | a whole number | `0` |
| `bool` | `true` or `false` | `false` |

**Zero value** is a Go idea with no JavaScript twin. A variable you create without a value is never `undefined`. It holds its type's zero value:

```go
var name string   // name is ""
var count int     // count is 0
```

There is no `undefined` in Go at all.

## Constants

```go
const maxPerPage = 100
```

Like `const` in JavaScript, but the value must be known when the program is compiled: a number, a string, or arithmetic on other constants.

## Functions

```go
func clamp(n, lo, hi int) int {
```

`n, lo, hi int` is short for `n int, lo int, hi int`. The last `int` is what the function returns.

## `if`, without truthiness

JavaScript lets any value act as a condition, and the Next.js handler leans on that:

```js
const sort = searchParams.get("sort") || "all";   // empty string is "falsy"
```

Go does not. A condition must be a real `bool`, so you compare explicitly:

```go
if value != "" {
```

Go also has no `? :` operator. You write a short `if` instead. That is exactly why the Go handler has a tiny function named `valueOr`: it does the job of `||` above.

## Your turn

Open `exercise.go` and finish three functions:

1. `clamp(n, lo, hi int) int`
2. `valueOr(value, fallback string) string`
3. `perPage(requested int) int`, which uses your `clamp` and the two constants

```
go test ./01-values-and-functions
```

## After you pass

Open `solution.go`, then find the real `clamp` in `backend/internal/githubsearch/request.go`. It uses Go's built-in `min` and `max`, so its body is one line. Yours with two `if`s is just as correct.

## You now know

- `var`, `:=` and `const`
- Zero values, and that Go has no `undefined`
- Conditions must be real booleans

Next: [Lesson 02, structs and maps](../02-structs-and-maps/README.md).
