# Lesson 35: Answering the library's own result

**You will learn:** how a Go endpoint can answer with exactly what a JavaScript library would have produced, so the browser code around it does not change at all. You will also use a map as a set to allow only certain fields, and see why the server, not the browser, decides which fields may change.

**Real code:** `backend/internal/onboarding/handler.go`, `Result` in `backend/internal/supabaserest/supabaserest.go`, and `goResult` in `src/lib/go-data.js`.

## The problem in the app

The onboarding steps save your answers with code like this:

```js
const { data, error } = await supabase.from("onboarding_data").select("*").eq("user_id", userId).single();
if (error) {
  if (error.code === "PGRST116") return null; // no row yet
  if (error.code === "42P01") throw new Error("Onboarding table does not exist. ...");
  throw error;
}
return data;
```

Everything after the call depends on the exact `{ data, error }` supabase-js gives back, error codes included. Lesson 34 had Go answer each function's final value. Here that would mean rewriting all those branches. Instead, Go answers **the call's own result**, and only the call changes:

```js
const { data, error } = await resultFrom(AREA, `/api/onboarding?${params}`, {}, () =>
  supabase.from("onboarding_data").select("*").eq("user_id", userId).single()
);
```

## Building the same answer in Go

`supabaserest.Result` turns one Data API reply into the JSON supabase-js would have made: `{"data": ..., "error": null}` on success, the database's own error object on failure, and, with no reply at all, the error supabase-js invents, `"TypeError: fetch failed"`. It builds the answer from raw JSON pieces (`json.RawMessage`, lesson 23), so the row passes through as the database sent it.

How do we know it matches? The recorder works out each expected answer by running the **real postgrest-js** on the same reply. The Go contract test then compares Go's answer with those, case by case.

## A map as a set

An update may change only the fields the onboarding writes. Go has no set type, so a `map[string]bool` does the job:

```go
var Writable = map[string]bool{"current_step": true, "role": true, /* ... */}

for _, change := range changes {
	if !Writable[change.Name] {
		write(w, 200, failure("onboarding_data."+change.Name+" cannot be changed here", "42501"))
		return
	}
}
```

Looking up a key that is not there gives the zero value, `false`, so `!Writable[name]` is true for anything not listed. In JavaScript you would write `new Set([...]).has(name)`.

## Why the server decides

Before, the browser could send any update. Row-level security stopped it from touching other users' rows, but within your own row you could change any column, `user_id` included. Through Go, only the listed fields pass. The browser never sends anything else, so nothing it does changes, but a hand-made request can no longer move a row to someone else. Rules that matter belong on the server, because the browser is the one part you do not control.

## Your turn

Open `exercise.go` and write `firstNotAllowed`, which finds the first field that may not be changed.

```text
go test ./35-answering-the-librarys-own-result
go test -tags solution ./35-answering-the-librarys-own-result
```

## You now know

- Answering a library's own result lets the code around a call stay exactly as it was.
- A reference implementation, here the real postgrest-js, can produce the expected answers for a test.
- A `map[string]bool` works as a set: a missing key reads as `false`.
- Field rules that matter belong on the server.
