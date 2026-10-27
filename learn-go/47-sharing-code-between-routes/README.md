# 47. Share code between routes: move it into its own package

Real code: `Read` and `Handler` in `backend/internal/publicrepo/publicrepo.go`,
used by `backend/internal/starred/handler.go` and served by `publicRepoMux` in
`backend/cmd/api/main.go`.

The repository page asks GitHub about one repository, and only shows it when
GitHub says it is public. The Go port of the starred route already had that
read, as a function called `publicRepo` inside package `starred`. To serve the
repository page from Go too (REPO-PAGE-001), the function moved into a package
of its own, so both can use it.

## A package is a folder, and a capital letter exports

In JavaScript you write `export function fetchRepo…` and import it by file
path. In Go, every `.go` file in one folder belongs to one package, and a name
is visible to other packages when it starts with a capital letter. There is no
`export` keyword (lesson 00).

Inside `starred`, the function was `publicRepo`: lower case, so only `starred`
could call it. In its new home it is `Read`:

```go
package publicrepo

func Read(ctx context.Context, client *http.Client, base, owner, repo string) ([]jscompat.Field, bool) {
```

Other packages call it with the package name in front, so the name does not
repeat it: `publicrepo.Read`, not `publicrepo.ReadPublicRepo`. Package names
are short, lower case, one word, with no underscores.

`starred` now imports the package by its module path and calls it:

```go
import "github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/publicrepo"

if fields, ok := publicrepo.Read(ctx, h.GitHub, base, owner, repo); ok {
```

The `internal` folder in that path matters: only code inside `backend/` may
import it. Go enforces that, which JavaScript cannot.

## No circles

`publicrepo` imports `githubrepos` (for the name rules), and `starred` imports
`publicrepo`. If `publicrepo` also imported `starred`, Go would refuse to
build: "import cycle not allowed". JavaScript allows circular imports and then
surprises you with `undefined` at start-up. Go makes you put shared code below
both users, which is why it moved out instead of `starred` exporting it.

## The tests move with the code

`TestPublicRepositoryReads` ran the 15 cases of
`contracts/public-repository-reads` against `publicRepo`. It moved to
`publicrepo_test.go` and now calls `Read`. A new test,
`TestRouteAnswersTheContract`, runs the same 15 cases through the HTTP route.
The JavaScript tests run them against `fetchRepoFromGitHub`, and against the
page's read through Go. One set of cases pins all of them.

## The rule it protects

`src/lib/repo/repoData.js` keeps a repository only when
`data?.private === false`. Strict equality: the JSON value `false`. Not the
text `"false"`, not `0`, not a missing field. `Read` compares the field's raw
JSON text with `false`, so nothing is converted on the way.

## Your exercise

Implement `isPublic` in `exercise.go`: given a reply's bytes, say whether it
is one JSON object whose `"private"` field is the JSON value `false`. Like
`JSON.parse`, a name given twice keeps its last value. Hint: decode into
`map[string]json.RawMessage`, which keeps each value's text undecoded.

```powershell
go test ./47-sharing-code-between-routes
go test -tags solution ./47-sharing-code-between-routes
```

The exercise is intentionally unfinished. The solution shows one way to do it.
