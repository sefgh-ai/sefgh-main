# Lesson 02: Structs and maps

**You will learn:** how to group data, how to look things up, and why one real bug in this app cannot happen in Go.

**Real code:** `sortOption` and `sortOptions` in `backend/internal/githubsearch/request.go`.

## The problem in the app

The search page lets a user pick a filter such as "Latest" or "Featured". GitHub does not know those names. It wants `sort=updated` or `sort=stars`. So the handler keeps a small table that translates our names into GitHub's.

In the Next.js handler the table is an object. Two of its five entries are left out here to keep it short:

```js
const filterMap = {
  all: { sort: "", order: "desc" },
  latest: { sort: "updated", order: "desc" },
  featured: { sort: "stars", order: "desc" },
};
```

In Go it is a map of structs:

```go
type sortOption struct {
	sort  string
	order string
}

var sortOptions = map[string]sortOption{
	"all":      {sort: "", order: "desc"},
	"latest":   {sort: "updated", order: "desc"},
	"featured": {sort: "stars", order: "desc"},
}
```

## Structs

A struct is a group of named fields, each with a type. It is like a JavaScript object whose shape is fixed in advance: you cannot add a field later, and you cannot misspell one without the compiler noticing.

```go
option := sortOption{sort: "stars", order: "desc"}
fmt.Println(option.sort)   // stars
```

Two structs of the same type can be compared with `==`. They are equal when all their fields are equal.

## Maps

`map[string]sortOption` reads as "a map from `string` keys to `sortOption` values". Every key has the same type, and so does every value.

```go
option := sortOptions["latest"]
```

What if the key is not there? JavaScript gives you `undefined`. Go has no `undefined`, so it gives you the **zero value**: a `sortOption` with both fields empty. That is easy to mistake for a real entry, so Go has a second form that also tells you whether the key was found:

```go
option, ok := sortOptions["latest"]   // ok is true
option, ok := sortOptions["bogus"]    // ok is false
```

This is called the **comma ok** form. You will see it everywhere in Go.

## The bug that cannot happen here

The Next.js handler used to look up the filter like this:

```js
const filterConfig = filterMap[sort] || filterMap["all"];
```

Now imagine a request with `sort=constructor`. Every JavaScript object inherits a property called `constructor`, so `filterMap["constructor"]` is not `undefined`. The fallback never ran, and the handler sent the literal text `sort=undefined` to GitHub. That was one of the 13 defects fixed on 2026-10-11, using `Object.hasOwn`.

A Go map has no inherited keys. It contains exactly what you put in it. The lookup `sortOptions["constructor"]` is simply "not found". The contract still has a test for it, and the Go code passes without doing anything special.

## Loops

Go has one loop keyword, `for`. To walk through a list:

```go
for _, name := range names {
	// use name
}
```

`range` hands you two things each time round: the position and the item. `_` means "I do not need this one". Go refuses to compile a variable you never use, so `_` is how you throw a value away.

`names` here is a **slice**, Go's version of an array: `[]string` is "a slice of strings".

## Your turn

Open `exercise.go` and finish:

1. `lookupSort`, using the comma ok form
2. `countKnown`, using a `for ... range` loop
3. `describe`

```
go test ./02-structs-and-maps
```

The table and the struct are in `lesson.go`. You do not need to change that file.

## Real task: make "Most Stars" work

This one changes the real app. Take it on once the exercise passes.

**The bug.** The search navbar offers "Most Stars" and "Recently Updated". It sends `sort=stars` and `sort=updated`. Neither name is in the table, so both fall back to `all` and the buttons do nothing. This is recorded as an open defect in `contracts/github-search/cases.json`.

**The fix** is two new entries in the table, made in both programs, with the contract changed first. (`best-match`, the navbar's fourth choice, already works: an unknown name means `all`, which is GitHub's best-match order.)

1. In `contracts/github-search/cases.json`, find the cases `sort-navbar-stars-ignored` and `sort-navbar-updated-ignored`. Change each `expect_upstream_url` so it expects `sort=stars` and `sort=updated`. Change `"disposition"` from `"defect"` to `"preserve"`, and rewrite the two `note` lines to say what now happens. Raise `"contract_version"` to 3.
2. Run both test suites. Both must now **fail** on those two cases. That is the point: the contract now asks for something neither program does.

   ```
   npm run test:contracts              (from the repository root)
   go test ./...                       (from the backend folder)
   ```

3. Add the entries to `sortOptions` in `backend/internal/githubsearch/request.go`. Run the Go tests until they pass.
4. Add the same entries to `filterMap` in `src/app/api/github/search/route.js`. Run the Next.js tests until they pass.
5. Add a version 3 row to the table in `contracts/github-search/README.md`, and remove the open defect from that file and from `docs/adr/0002-go-backend.md`.

Commit all of it together. The rule in this project is that the contract and every program that follows it change in the same commit, so they can never disagree.

You can also ask Codex or Claude to review your change before you commit.

## You now know

- Structs, maps and slices
- The comma ok form
- `for ... range`, and `_` for values you do not need

Next: [Lesson 03, strings and bytes](../03-strings-and-bytes/README.md).
