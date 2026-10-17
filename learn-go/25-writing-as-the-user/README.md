# Lesson 25: Writing to the database as the user

**You will learn:** how Go sends a request with a body, why a write still goes as the user and not as the server, how a type switch asks "what kind of value is this?", and how to copy JavaScript's `||` defaults and `.some()` exactly.

**Real code:** `backend/internal/collect/handler.go` (the port of `/api/repo/collect`), `Insert` and `Delete` in `backend/internal/supabaserest/supabaserest.go`, and `String` in `backend/internal/jscompat/tostring.go`.

## The problem in the app

The bookmark button on a repository saves it to your collection, and pressing it again removes it. Behind it is one route with three methods:

- `POST` saves a repository;
- `DELETE` removes it;
- `GET` asks whether it is saved, and how many saves it has.

It is the first route in Go that **changes** the database. Every route before it only read.

## A request with a body

Lesson 22 read rows with a `GET`. Saving one is a `POST` to the Data API with the row as JSON. Go builds the request the same way, with a method and a body:

```go
req, err := http.NewRequestWithContext(ctx, method, target, reader)
```

`reader` is `bytes.NewReader(body)` for an insert, and `nil` for a delete, which has no body. The headers are the ones supabase-js sends: a write names the schema in `Content-Profile` and says its body is JSON. The test `TestWritesAskAsTheCaller` checks both.

## A write still goes as you

The server could have its own all-powerful key and write anything. It deliberately does not. Every insert and delete carries **your** token:

```go
upstream, raw, err := db.Insert(r.Context(), session, "repo_collections", row)
```

The row names your user id. The database checks that too: its rule for `repo_collections` lets a user add a row only when `user_id` is that user's own (`docs/database/user-db.md`). So even a bug in this handler could not save a repository into someone else's collection. Two locks are better than one.

## JavaScript's `||`

The Next.js handler stores:

```js
collection_name: collectionName || 'default',
notes: notes || null
```

`||` picks the right side whenever the left side is *falsy*: missing, `null`, `false`, `0`, or empty text. Go has no such rule built in, so the handler spells it out:

```go
if !truthy(collection) {
	collection = json.RawMessage(`"default"`)
}
```

An empty `collectionName` becomes `"default"`, exactly as in JavaScript. The case `post-falsy-collection` in the contract checks it.

## A type switch: what kind of value is this?

A value read from JSON in Go is `any`: it could be text, a number, a list, an object, `true` or `nil`. To act differently for each, Go has a **type switch**:

```go
switch v := value.(type) {
case nil:
	return "null"
case bool:
	return strconv.FormatBool(v)
case string:
	return v
case []any:
	// join the items with commas
}
return "[object Object]"
```

Inside each `case`, `v` already has that type. This is `jscompat.String`, which copies JavaScript's `String(value)`. The route needs it because supabase-js writes `.eq('repo_full_name', value)` into the URL with a template literal. If someone sends a number or a list as the repository name, JavaScript turns it into text, so `["octo", null, 1.5e3]` becomes `octo,,1500`, and Go must write the same text.

In JavaScript you would write `typeof value === 'string'` checks one after another. The type switch does them all at once.

## `.some()`, exactly

To answer "have you saved it?", the handler asks:

```js
saves?.some(s => s.user_id === user.id) || false
```

Copying it takes care:

- `some()` stops at the first match, so a bad row *after* a match is never looked at;
- a row that is `null` makes `s.user_id` throw, which the handler turns into a 500;
- `===` is strict: an id that is the number `7` never equals the text `"7"`.

That is your exercise.

## Checking it against JavaScript

The contract `contracts/repo-collect` (49 cases) was recorded by running the three real Next.js handlers with the real supabase-js around a stand-in database. Each case records every request the handler made: method, URL, headers and body. Go passes all 49. Five deliberate mistakes were tried, such as writing with the public key instead of your token, or forgetting that `null` throws. Each one makes cases fail.

The contract also keeps a known bug on purpose. The count of saves reads the table *as you*, and the database shows you only your own rows, so "saved by N people" only ever counts you (bug register R-083). The port copies it, so the two can be compared before the switch; the fix comes later, in Go.

## Your turn

Open `exercise.go` and write `savedBy`, following its steps.

```text
go test ./25-writing-as-the-user
go test -tags solution ./25-writing-as-the-user
```

## You now know

- `http.NewRequestWithContext` takes a method and a body; `bytes.NewReader` turns bytes into a body.
- A write that goes with the user's own token keeps the database's rules in charge.
- JavaScript's `||` falls back on any falsy value, and Go must spell that out.
- A type switch handles each kind of value in its own `case`.
- Copying `.some()` means stopping at the first match, and failing where JavaScript would throw.
