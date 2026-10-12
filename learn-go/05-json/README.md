# Lesson 05: JSON

**You will learn:** how Go turns structs into JSON and back, and how to control `null` versus "not there at all".

**Real code:** `rateLimit`, `errorResponse` and `searchResponse` in `backend/internal/githubsearch/handler.go`.

## The problem in the app

JavaScript objects and JSON are nearly the same thing, so the Next.js handler barely thinks about it:

```js
return NextResponse.json({ error: "Search query is required" }, { status: 400 });
```

Go structs are not JSON. You describe how each field should be written. And the search contract is picky in a way that matters here. Compare these two replies:

```json
{ "rate_limit": { "remaining": null, "reset": null } }
```

```json
{ "error": "Search query is required" }
```

In the first, `remaining` is present with the value `null`. In the second, `rate_limit` is missing completely. The contract tests treat those as different, because the browser code can tell them apart. Go has to get both right.

## Struct tags

```go
type rateLimit struct {
	Remaining *string `json:"remaining"`
	Reset     *string `json:"reset"`
}
```

The text in backticks is a **tag**. It tells the JSON package what to call the field. Without a tag, the field would be written as `Remaining`, with the capital letter.

That capital letter is required. The JSON package lives in another package, and from lesson 00 you know other packages can only see names that start with a capital. A lower-case field is silently skipped.

## Pointers: a value, or nothing

A `string` always holds some text, even if it is `""`. It cannot be "nothing". But GitHub sometimes sends the rate-limit header and sometimes does not, and the contract says a missing header must become `null`.

A **pointer** solves this. `*string` means "either the location of a string, or `nil`":

```go
var remaining *string    // nil, written as null in JSON

text := "9"
remaining = &text        // & means "the location of"; written as "9"
```

To read the string a pointer leads to, put `*` in front: `*remaining`. Reading through a `nil` pointer crashes the program, so check for `nil` first.

## Leaving a field out

```go
type errorResponse struct {
	Error     string     `json:"error"`
	RateLimit *rateLimit `json:"rate_limit,omitempty"`
}
```

`omitempty` means "skip this field when it is empty", and for a pointer empty means `nil`. So the same struct produces both shapes the contract needs:

| `RateLimit` is | JSON written |
|---|---|
| `nil` | `{"error":"..."}` |
| a pointer to a `rateLimit` | `{"error":"...","rate_limit":{...}}` |

Notice the two tools: a `nil` pointer **without** `omitempty` writes `null`. A `nil` pointer **with** `omitempty` writes nothing.

## Writing and reading

```go
data, err := json.Marshal(value)      // struct  -> JSON bytes
err := json.Unmarshal(data, &value)   // JSON bytes -> struct
```

`Unmarshal` needs `&value`, the location of your variable, so that it can fill it in.

## Passing JSON through untouched

GitHub's reply contains a long list of repositories. The handler does not need to understand them. It only passes them on. `json.RawMessage` means "keep this piece of JSON exactly as it arrived":

```go
type searchResponse struct {
	TotalCount json.RawMessage `json:"total_count"`
	Items      json.RawMessage `json:"items"`
	RateLimit  rateLimit       `json:"rate_limit"`
}
```

This avoids defining a Go struct for every repository field. RawMessage preserves the supplied JSON value, but the enclosing encoder may compact whitespace or escape characters. Do not promise byte-for-byte identity with the original response; our contract compares JSON structure.

## Your turn

Open `exercise.go`.

1. Add tags to `rateLimit` and `errorReply` so the tests get exactly the JSON they expect. One field needs `omitempty`.
2. Write `totalCount`, which reads one number out of a JSON body. Declare a small struct with one tagged field and `Unmarshal` into it. You will need `import "encoding/json"`.

```
go test ./05-json
```

When a test fails it prints the JSON you produced above the JSON it wanted. Compare them character by character.

## You now know

- Struct tags, and why JSON fields need a capital letter
- Pointers, `nil`, `&` and `*`
- `omitempty`, and the difference between `null` and missing
- `json.Marshal`, `json.Unmarshal` and `json.RawMessage`

Next: [Lesson 06, HTTP handlers](../06-http-handlers/README.md).
