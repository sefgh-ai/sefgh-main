# Lesson 23: Passing JSON through untouched

**You will learn:** how to send on JSON you did not write without changing it, how Go code is shared between routes with packages, why some Go names start with a capital letter, and how one deadline can cover a whole group of goroutines.

**Real code:** `backend/internal/starred` (the port of `GET /api/repo/starred`), `ObjectFields` and `WriteObject` in `backend/internal/jscompat/rawjson.go`, and `backend/internal/supabaserest`.

## The problem in the app

The starred page lists the repositories you saved. The route reads your rows from the `repo_collections` table, checks each repository with GitHub again, and answers with your rows plus fresh GitHub details. The Next.js handler does it in one line:

```js
return { ...repo, repo_data: freshDetails }
```

`...repo` copies every column of your row, whatever columns the table has today, in their order. Go has no `...`, and Go's usual tools fit badly here:

- Decoding into a struct needs every column written out in advance. Add a column to the table and Go would silently drop it.
- Decoding into a `map[string]any` keeps the columns but loses their order, and turns every number into a `float64`, which can change a very large number.

## Keep each value as it was written

`json.RawMessage` is a value's own JSON text, kept as bytes. Go reads the shape of the object (where each name and value starts and ends) and leaves the values alone:

```go
for decoder.More() {
	token, err := decoder.Token()  // the name
	...
	var value json.RawMessage       // the value, exactly as written
	if err := decoder.Decode(&value); err != nil {
		return nil, false
	}
	...
}
```

That is `ObjectFields`. It gives a list of `Field{Name, Value}` in order. Writing them back out is `WriteObject`, which puts the names and the untouched values between braces. Whatever was in the row (text in any language, a huge number, a nested list) reaches the browser just as the database sent it.

One JavaScript rule had to be copied. If an object repeats a name, `JSON.parse` keeps the name in its **first** place with its **last** value. `ObjectFields` does the same, with a small map from each name to its position.

## Leaving out what is missing

The fresh details are six fields: `description`, `stargazers_count`, `forks_count`, `language`, `topics` and `updated_at`. In JavaScript, a field GitHub did not send is `undefined`, and `JSON.stringify` leaves it out of the reply entirely, while a field that is `null` stays `null`. `summary` in `github.go` does the same: it keeps the six names in that order and skips any GitHub did not send. Your exercise is that function.

## Packages: one copy, shared

The activity route (lesson 22) already asked the database as you. The starred route needs exactly the same request, so that code moved into its own package, `backend/internal/supabaserest`, and both routes import it:

```go
db := supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
upstream, raw, err := db.Select(r.Context(), session, "repo_collections", query)
```

A package is a folder of Go files. In JavaScript you would `export` a function from a file and `import` it elsewhere. Go has no `export` keyword: **a name that starts with a capital letter can be used from other packages, and a lowercase one cannot.** `Select` and `ReadResult` are capitalised for that reason.

The repository-name rules worked the same way. They were lowercase (`validRepoName`) inside `githubrepos`, so the starred package could not see them. Copying them would mean two rule sets that could drift apart, and these rules stop a stored name from reaching the wrong GitHub address. So `githubrepos` gained two capitalised wrappers, `ValidOwner` and `ValidRepoName`, and both routes now use one set of rules.

## One deadline for a group of goroutines

Each saved repository is checked with GitHub, four at a time (lesson 18 showed this pattern). Each check may take up to 10 seconds. With 40 saved repositories and a slow GitHub that adds up to 100 seconds, but this server allows 30 seconds for a whole reply.

So the checks share one budget:

```go
ctx, cancel := context.WithTimeout(ctx, budget)
defer cancel()
```

Every goroutine gets this same `ctx`. When the budget runs out, every request still waiting is cancelled together, and those rows show no details, exactly as if GitHub had failed. `TestRefreshBudgetBoundsSlowGitHub` makes GitHub hang and checks that the reply still arrives quickly.

## Checking it against JavaScript

The contract `contracts/repo-starred` was recorded by running the real Next.js handler (`scripts/contracts/record-repo-starred.mjs`), and Go passes all 14 cases. It also passes the 15 cases that already pinned each GitHub check. For unusual rows (a row that is a list, a number, text), the expected answers in `TestRowsOfOtherKinds` were also produced by running the Next.js handler: Go's replies match it character for character.

## Your turn

Open `exercise.go` and write `pick`. Given a list of fields and a list of names, it returns the fields with those names, in the order of `names`, leaving out any name that is not present.

1. Put the fields in a map from name to field, so each one can be found quickly.
2. Go through `names` in order. When a name is in the map, append that field to the result.
3. Return the result. A name that is not there adds nothing, which matches JSON leaving out `undefined`.

```text
go test ./23-passing-json-through
go test -tags solution ./23-passing-json-through
```

## You now know

- `json.RawMessage` keeps a value's own JSON text, so data you did not write passes through unchanged.
- `json.Decoder.Token` reads an object's structure one piece at a time.
- A package is a folder; names starting with a capital letter are exported to other packages.
- Sharing one copy of a rule is safer than copying it.
- One `context.WithTimeout` can bound a whole group of goroutines at once.
