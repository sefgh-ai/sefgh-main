# Lesson 24: Optional sign-in, and a URL that matches byte for byte

P7-03 update (2026-11-02): the share Next.js handlers, unused browser share
helper and legacy recorders are retired. JavaScript handler snippets below
are historical port comparisons (parent `18b921e`); Go implementations and
all92share cases remain. Go still checks optional bearer/public-key reads,
owner-scoped writes, fork isolation and verified share removal. Node checks
fixture integrity. Share URLs require SEFGH_GO_API_URL and are404 without it.
Exercise implementations and solutions are unchanged; lesson checks optional.


**You will learn:** how a Go route takes a value out of its path, how a handler serves visitors who may or may not be signed in, why two "encode this for a URL" functions can disagree, and how to copy the browser's version exactly.

**Real code:** `backend/internal/sharetoken/handler.go` (the port of `GET /api/share/[token]`), `SessionToken` in `backend/internal/githubaccess/access.go`, `FormEncode` in `backend/internal/jscompat/jscompat.go`, `Param` and `SelectObject` in `backend/internal/supabaserest`, and `shareMux` in `backend/cmd/api/main.go`.

## The problem in the app

When you share a chat, you get a link like `/s/9c1e5d2a7b3f4e6d8a0b1c2d`. The page asks `GET /api/share/<token>` for the conversation. Anyone with the link can read a public share, signed in or not. A private share is different: only its owner can even find it, and this route still answers them "Private link". So the route must work for signed-out visitors and for signed-in ones, and treat them differently.

## A value in the path

Next.js takes the token from the folder name: the file lives in `src/app/api/share/[token]/route.js`, and the handler reads `params.token`. Go writes the same thing as a pattern:

```go
mux.Handle("GET /api/share/{token}", &sharetoken.Handler{...})
```

and the handler reads it with:

```go
r.PathValue("token")
```

Two things come for free. The method is part of the pattern, so a `POST` to this path gets `405 Method Not Allowed` without any code of ours. And `PathValue` hands back the token already decoded: `/api/share/caf%C3%A9` gives `café`, just as Next.js does. `TestShareServesOnlyItsOwnRoute` checks that the fork route underneath, `/api/share/<token>/fork`, is not answered here.

## Signed in, or not

The browser sends a signed-in visitor's token as `Authorization: Bearer <token>` (lesson 22). Signed out, there is no header. The handler reads it like this:

```go
session, signedIn := githubaccess.SessionToken(r)
if !signedIn {
	session = h.SupabaseKey
}
```

`SessionToken` returns two values: the token, and whether there was one. Go uses this "value, ok" pair wherever an answer may be missing. In JavaScript you would return `null` and check for it. Here the missing case can't be mistaken for a real value.

Signed out, the database is asked with the project's public key instead, which is exactly what supabase-js sends when nobody is signed in. Either way, the database's own row rules decide what comes back: a public share for anyone, and a private one only for its owner.

Unlike lessons 22 and 23, this handler does not first ask Supabase Auth who the visitor is. It does not need a user id, and the database checks the token itself. An expired token is refused there, and the route answers "Not found", as the Next.js handler does.

## Two encoders that disagree

To ask for one share, supabase-js writes `.eq('share_token', token)` into the URL. Lesson 22 used Go's `url.QueryEscape` for this. Most of the time it gives the same answer as the browser, but not always:

| Character | Browser's `URLSearchParams` | Go's `url.QueryEscape` |
|---|---|---|
| `*` | `*` | `%2A` |
| `~` | `%7E` | `~` |
| space | `+` | `+` |

The database decodes both the same way, so nothing broke. But this route's contract records the exact URL supabase-js sends, and a URL that only *means* the same thing would fail it. So `jscompat.FormEncode` copies the browser's rule exactly: letters, digits and `* - . _` stay as they are, a space becomes `+`, and every other byte becomes `%` and two capital hex digits.

```go
switch {
case c == ' ':
	b.WriteByte('+')
case 'A' <= c && c <= 'Z' || 'a' <= c && c <= 'z' || '0' <= c && c <= '9' || strings.IndexByte("*-._", c) >= 0:
	b.WriteByte(c)
default:
	b.WriteByte('%')
	...
}
```

A `switch` with nothing after the word works like a chain of `if`/`else if`: the first case that is true runs. `Param` now uses `FormEncode`, so activity and starred send the browser's URL too. Their tests decode the query before comparing, so they pass as before.

The expected answers in `TestFormEncode` were produced by running `new URLSearchParams(...)` in Node, every printable ASCII character included.

## Checking it against JavaScript

The contract `contracts/share-token` (17 cases) was recorded by running the real Next.js handler. This time the runner, `scripts/contracts/share-fixture.mjs`, builds the handler's database client with the **real** supabase-js and only swaps its `fetch` for a stand-in. So the URL, the headers and the way each reply is read all come from supabase-js itself, not from a copy of it. Go passes all 17 cases, comparing the URL character for character.

## Your turn

Open `exercise.go` and write `bearer`, a simpler version of the rule the server uses. The real one, `sessionToken` in `backend/internal/githubaccess/access.go`, also accepts the word `bearer` in any case, allows only the characters a token can hold, and refuses a request with two `Authorization` headers. Every route reads the header with it, so two routes never disagree about whether a visitor is signed in.

1. `strings.CutPrefix(header, "Bearer ")` returns what follows the prefix, and whether the prefix was there.
2. Without the prefix, or with nothing after it, return `"", false`.
3. A token never holds a space or a tab. `strings.ContainsAny(token, " \t")` finds either; if so, return `"", false`.
4. Otherwise return the token and `true`.

```text
go test ./24-optional-sign-in
go test -tags solution ./24-optional-sign-in
```

## You now know

- `"GET /path/{name}"` routes one method, and `r.PathValue("name")` returns that part of the path, decoded.
- A "value, ok" pair says plainly when an answer is missing.
- A route can serve signed-in and signed-out visitors, and leave the database's rules to decide what each may read.
- Two URL encoders can produce different bytes with the same meaning. When a contract pins the bytes, copy the browser's rule.
- A `switch` with no value is a tidy chain of conditions.


## BUG-050: R-084

Auth outages now return 503 with fixed text Sign-in could not be verified before any database request in collect, vote, rating, comment votes, comment writes and video writes. Refused sessions retain their existing policy.

The real backend and fixtures pin this change. Go returns early for errors and keeps the user's request scope. The regression was shown failing before the fix and under a deliberate break. Existing exercise.go files are untouched; lesson checks remain optional.


## BUG-053: R-081

Public share settings failures return fixed Internal server error text with500. Library configuration messages no longer reach visitors; sanitized stage logging remains.

The real backend and fixtures pin this change. Go returns early for errors and keeps the user's request scope. The regression was shown failing before the fix and under a deliberate break. Existing exercise.go files are untouched; lesson checks remain optional.

The settings guard returns a constant JSON body as []byte rather than encoding the library error. A literal is appropriate here because it contains no user-supplied value to escape. The log records only a stage and status; the caller receives a stable public message.


## BUG-054: R-082

Public share reads return404 only for a zero-row result or empty/null success. Network, HTTP, parse and invalid non-object results return503 with fixed Share could not be loaded text. Explicit private links retain403, public replies and caller credentials remain unchanged.

The real backend and fixtures pin this change. Go returns early for errors and keeps the user's request scope. The regression was shown failing before the fix and under a deliberate break. Existing exercise.go files are untouched; lesson checks remain optional.

An HTTP failure, a JSON decoding failure, and a missing row are three different results. Go checks err first, then the zero-row PostgREST result, then status and decoded data. A nil decoded value is absence; a false value, zero, or array is invalid for a single-row lookup. The type assertion row, isObject := data.(map[string]any) lets the handler distinguish those without panicking.
