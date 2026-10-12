# Lesson 14: Checking input before you trust it

**You will learn:** regular expressions in Go, the difference between an allowlist and a blocklist, and how to put outside text into a URL safely.

**Real code:** `backend/internal/githubrepos/identifiers.go`. The Next.js version of the same rules is `src/lib/github/repo-identifiers.js`.

## The problem in the app

The repository routes take an owner and a name from the request and build a GitHub URL from them:

```go
target := h.baseURL + "/repos/" + owner + "/" + name
```

That looks harmless. Now suppose a request arrives with `owner=..` and `name=../user`. The URL becomes:

```
https://api.github.com/repos/../../user
```

In a URL, `..` means "go up one folder". GitHub reads that address as `https://api.github.com/user`, a completely different endpoint, and the request carried the server's own token. The caller chose where your token was sent.

This was real. It was found in review, the owner approved a fix on 2026-10-12, and both the Next.js and Go handlers changed together. The contract has a case named `summary-traversal-to-another-endpoint` that now expects a 400 and no request to GitHub at all.

## Say what is allowed, not what is forbidden

The contents route used to check its path like this:

```js
!candidate.includes('..') && !candidate.startsWith('/') && !candidate.includes('\\')
```

That is a **blocklist**: a list of bad things. Its weakness is that you have to think of every bad thing. This one missed `#`, which cuts a URL short, `?`, which starts a query, and `%2e%2e`, which is `..` in disguise. It also blocked an innocent file called `a..b.txt`.

An **allowlist** turns it round. You describe what a good value looks like, and reject everything else:

- An owner: a letter or digit, then letters, digits, hyphens or underscores, 39 characters at most.
- A repository name: letters, digits, dots, hyphens and underscores, 100 at most, and not `.` or `..`.

None of those characters can change what a URL means, so nothing built from them can go anywhere unexpected. You do not need to know every trick, only what normal looks like.

## Regular expressions in Go

```go
var ownerPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$`)

func validOwner(owner string) bool {
	return ownerPattern.MatchString(owner)
}
```

Three things to notice.

1. **Backticks make a raw string.** Inside them a backslash is just a backslash, so patterns stay readable. JavaScript has `/.../` for this; Go uses an ordinary string.
2. **`MustCompile` runs once, when the program starts.** The pattern is a package-level variable, so it is prepared a single time and reused by every request. "Must" means it stops the program at start-up if the pattern has a mistake, which is what you want: better to fail immediately than on the first request.
3. **`^` and `$` matter.** They pin the pattern to the whole value. Without them, `MatchString` is satisfied by a match anywhere inside, and `../octo` would pass because `octo` matches.

Go's regular expressions are also guaranteed to run in time proportional to the input. A JavaScript pattern can, in bad cases, take seconds on a short hostile string. A Go one cannot.

## A file path needs a different approach

File names really can contain `#`, `?`, `%` and spaces. A folder called `C#` is normal. So an allowlist of characters would reject real files.

The answer is to **encode** instead. Split the path at each `/`, percent-encode every part on its own, and join them back:

```
docs/C#/readme.md   ->   docs/C%23/readme.md
```

Now `#` is plainly part of a name. The only parts refused are the ones that are not names at all: an empty part, `.`, and `..`.

Encoding the parts separately is the important detail. If you encoded the whole path in one go, the `/` separators would be encoded too, and the path would become one long name.

## Two return values again

```go
func encodeContentsPath(path string) (string, bool) {
```

This is the "comma ok" shape from lesson 02, used for a function's own result. The string is the answer and the boolean says whether there is one. The caller cannot use the string without also receiving the boolean:

```go
encodedPath, ok := encodeContentsPath(path)
if !ok {
	h.fail(w, 400, "Invalid path parameter")
	return
}
```

The JavaScript version returns `null` for "not acceptable", and nothing forces the caller to check.

## Your turn

Open `exercise.go`.

1. `repoPattern` and `validRepoName`: write the pattern for a repository name, and remember that `.` and `..` must be refused even though they are made of allowed characters.
2. `encodePath`: split on `/`, refuse an empty part, `.` or `..`, and encode each remaining part with the `escape` helper from `lesson.go`. An empty path is fine and stays empty.

```text
go test ./14-checking-input
go test -tags solution ./14-checking-input
```

One test takes values that pass `validRepoName` and checks that none of them contains a `/`, `?`, `#` or `%`. That is the whole point of the rule, written as a test.

## You now know

- An allowlist describes good input and rejects the rest. A blocklist has to predict every attack.
- `regexp.MustCompile` with a raw string, compiled once, and why `^` and `$` are not optional.
- Text that cannot be restricted, like a file name, is encoded part by part.
- Returning `(value, ok)` makes a caller deal with the failure.
