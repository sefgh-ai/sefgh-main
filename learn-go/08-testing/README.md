# Lesson 08: Testing

**You will learn:** how Go tests are written, what a table-driven test is, and how this project proves that two programs in two languages behave the same.

**Real code:** `backend/internal/githubsearch/contract_test.go` and `contracts/github-search/cases.json`.

## You have been using tests all along

Every `go test` you ran in lessons 00 to 07 ran a file ending in `_test.go`. The smallest possible one looks like this:

```go
package main

import "testing"

func TestGreeting(t *testing.T) {
	if got := greeting("Go"); got != "Hello, Go!" {
		t.Errorf("greeting(%q) = %q, want %q", "Go", got, "Hello, Go!")
	}
}
```

The rules are short:

- The file name ends in `_test.go`. Go leaves these files out of the real program.
- A test is a function whose name starts with `Test` and which takes `t *testing.T`.
- A test passes unless it reports a failure. `t.Errorf` reports one and carries on. `t.Fatalf` reports one and stops that test.

There is no `expect(...).toBe(...)`. You compare with a plain `if` and write the message yourself. `%q` prints a value in quotes, and `%v` prints anything.

## Table-driven tests

Most tests check the same function with many inputs. Go programmers put the inputs in a list and loop over it:

```go
tests := []struct {
	in   string
	want int
}{
	{"7", 7},
	{"0", 1},
	{"5000", 1000},
}
for _, tt := range tests {
	if got, _ := parsePage(tt.in); got != tt.want {
		t.Errorf("parsePage(%q) = %d, want %d", tt.in, got, tt.want)
	}
}
```

Adding a case is adding one line. `t.Run(name, func...)` goes one step further and makes each row its own named test, so a failure names the exact row.

## A test must be able to fail

A test that passes no matter what the code does is worse than no test, because it makes you feel safe. The way to check is to **break the code on purpose** and see whether the test notices.

When the search handler was ported to Go, all 174 checks passed on the first run. That was a reason for suspicion, not celebration. So the code was deliberately broken in three ways, such as changing the page limit from 1000 to 999, and each time exactly the right tests failed. Only then were the tests trusted.

Your exercise is the same idea in miniature.

## Your turn

`lesson.go` holds `validStars`, the real rule that decides whether a `stars` filter such as `>100` or `10..50` is allowed. It also holds three broken copies of it, each with one mistake.

Open `exercise.go` and add rows to `starsCases`. The tests want:

- at least six rows, some expecting `true` and some `false`
- every row correct
- every broken copy caught by at least one row

```
go test -v ./08-testing
```

`-v` lists each row by name. When a broken copy slips through, the failure message tells you which mistake your rows did not catch. Read that copy in `lesson.go` and think of an input it gets wrong.

## How the project tests two languages at once

Open `contracts/github-search/cases.json`. It is a table too, but written as data instead of code. One row looks like this, with two descriptive fields left out:

```json
{
  "id": "language-with-hash",
  "request": "q=react&language=C%23",
  "upstream": "empty",
  "expect_upstream_url": "q=react%20language%3AC%23&sort=&order=desc&page=1&per_page=30",
  "expect": "empty_ok"
}
```

It says: when this request arrives, exactly this URL must be sent to GitHub, and when GitHub gives the reply named `empty`, the caller must get the reply named `empty_ok`.

Two test programs read that one file:

- `scripts/contracts/github-search.test.mjs` runs every row against the Next.js handler.
- `backend/internal/githubsearch/contract_test.go` runs every row against the Go handler.

If both pass, the two handlers agree on every row. Switching still requires peer review, staging measurements, cache and timeout checks, and the other ADR gates. Neither test talks to the real GitHub. Each replaces GitHub with a stand-in that gives the reply the row names. Use `go test -count=1` after changing fixtures outside the Go module so cached test results cannot hide the change.

Find the loop in `contract_test.go`:

```go
for _, tc := range c.Cases {
	t.Run(tc.ID, func(t *testing.T) {
```

It is the same table-driven shape as your exercise, with the table loaded from a file.

## Real task: add a missing case

The contract checks the stars filters `>=50`, `<10`, `100..500` and `*`. Nothing checks `<=`. Add it.

1. In `contracts/github-search/cases.json`, find the case with the id `stars-less-than`. Add this new case straight after it, with a comma between them:

   ```json
   {
     "id": "stars-less-or-equal",
     "disposition": "preserve",
     "request": "q=react&stars=%3C%3D10",
     "upstream": "empty",
     "expect_upstream_url": "q=react%20stars%3A%3C%3D10&sort=&order=desc&page=1&per_page=30",
     "expect": "empty_ok"
   }
   ```

   `%3C` is `<` and `%3D` is `=`.

2. Run both suites:

   ```
   npm run test:contracts              (from the repository root)
   go test -v -run "TestContract.*/stars-less-or-equal" ./internal/githubsearch     (from the backend folder)
   ```

   The search suite gains one case (other route suites may also run). Use `-count=1` in the Go command after editing fixtures. The Go output shows your case running twice, once in `TestContract` and once in `TestContractOverHTTP`.

3. Break it on purpose. Change `%3D10` to `%3D11` in `expect_upstream_url`, run again, watch both suites fail on your case, then change it back.

A new case that describes what the programs already do needs no version change. `contract_version` rises only when an existing expectation changes.

## You now know

- `_test.go`, `Test` functions, `t.Errorf` and `t.Fatalf`
- Table-driven tests and `t.Run`
- Why you break code to test your tests
- How one fixture file keeps Next.js and Go in agreement

Next: [Lesson 09, path parameters](../09-path-parameters/README.md).
