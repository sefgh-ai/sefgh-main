# Lesson 30: Defaults, fallbacks and values that vanish

P7-03 update (2026-11-02): the share Next.js handlers, unused browser share
helper and legacy recorders are retired. JavaScript handler snippets below
are historical port comparisons (parent `18b921e`); Go implementations and
all92share cases remain. Go still checks optional bearer/public-key reads,
owner-scoped writes, fork isolation and verified share removal. Node checks
fixture integrity. Share URLs require SEFGH_GO_API_URL and are404 without it.
Exercise implementations and solutions are unchanged; lesson checks optional.


**You will learn:** the three ways JavaScript fills in a missing value, and how the Go share routes copy each one exactly. You will also see why Go has no negative slice index, and how to write JavaScript's `slice(-50)` without one.

**Real code:** `share` and `property` in `backend/internal/shares/handler.go`, and `ErrorMessage` in `backend/internal/supabaserest/supabaserest.go`.

## The problem in the app

When you share a conversation, the Next.js handler starts like this:

```js
const { isPublic = true, title, summary } = body || {}
...
p_is_public: isPublic,
p_title: title || conv.title,
p_summary: summary || null,
p_snapshot: Array.isArray(conv.messages) ? conv.messages.slice(-50) : [],
```

Three different defaults sit in those lines, and each fires in different cases.

## 1. A destructuring default fires only for `undefined`

`isPublic = true` is used when `isPublic` is missing. It is **not** used when it is `null` or `false`:

| Body | `isPublic` |
|---|---|
| `{}` | `true` |
| `{"isPublic": false}` | `false` |
| `{"isPublic": null}` | `null` |

In Go, a field that is missing from the JSON is a `nil` `json.RawMessage` (lesson 26), so the check is for `nil`, not for falsy:

```go
isPublic := field(fields, "isPublic")
if isPublic == nil {
	isPublic = json.RawMessage("true")
}
```

## 2. `||` fires for every falsy value

`summary || null` replaces `""`, `0`, `false`, `null` and `undefined` alike. So the Go check is JavaScript truth, `jscompat.TruthyJSON`:

```go
if !jscompat.TruthyJSON(summary) {
	summary = json.RawMessage("null")
}
```

Swap the two checks and different cases break. That is exactly what the deliberate breaks for this route tried, and the contract caught each one.

## 3. `undefined` vanishes from JSON

`title || conv.title` can still be `undefined`, when neither has a title. `JSON.stringify({ p_title: undefined })` writes `{}`: the field disappears, it does not become `null`. So the Go code leaves the field out:

```go
if title != nil {
	args = append(args, jscompat.Field{Name: "p_title", Value: title})
}
```

What the database function does without `p_title` depends on its definition, which is not kept in this repository. That is one more reason to send exactly what JavaScript sends.

## No negative indexes in Go

JavaScript's `slice(-50)` means "the last 50". Go has no negative index: `s[-50:]` does not compile, and a negative number in a variable makes the program crash at run time. You work out the start yourself:

```go
if len(elements) > snapshotSize {
	elements = elements[len(elements)-snapshotSize:]
}
```

`slice` never fails, whatever number you give it. A start past the end gives an empty list, and a negative one counts back from the end, never before the first item. Watch out for `-0`: in JavaScript it equals `0`, so `slice(-0)` is the whole list, not "the last zero".

## Error text that reaches the browser

These routes send errors to the browser as they are: `{ error: shareErr.message }`. To copy that, `supabaserest.ErrorMessage` works out the `message` supabase-js would give for each kind of reply. Every row of its test was checked against the real library. One kind cannot be copied: when JSON cannot be parsed, the text comes from the JavaScript engine itself and changes between Node versions. Those contract cases are marked `engine_message`, which pins the status but not the words. Sending such text at all is a bug (R-089), and it will be fixed in Go once the route is cut over.

## Your turn

Open `exercise.go` and write `jsSlice`, JavaScript's `array.slice(start)` for a Go slice of strings.

```text
go test ./30-defaults-and-missing-values
go test -tags solution ./30-defaults-and-missing-values
```

## You now know

- `= value` in destructuring fires only for `undefined`; in Go, check for `nil`.
- `||` fires for every falsy value; in Go, check `jscompat.TruthyJSON`.
- `undefined` fields vanish from JSON, so leave them out rather than writing `null`.
- Go has no negative indexes: work out the start, and keep it inside the slice.


## BUG-055: R-089

Creating, removing and forking a share now return fixed failure text: Share operation failed for existing400 responses and Internal server error for500. Status codes, authorization and not-found replies stay pinned. No database, library, transport or parser details are sent to visitors.

The real backend and fixtures pin this change. Go returns early for errors and keeps the user's request scope. The regression was shown failing before the fix and under a deliberate break. Existing exercise.go files are untouched; lesson checks remain optional.

BUG-055 changes the error response boundary: ErrorMessage still decodes an upstream result for internal control flow, while fail chooses a constant public message from the status. A missing upstream message no longer causes the response field to vanish. Earlier examples about a disappearing error field characterize the rollback handler; other optional fields still follow the rules above.


## BUG-068: removal needs a verified result

R-090 now updates all active shares matching both caller and conversation, then verifies an empty active-share list before reporting ok. Failed writes return the existing fixed400 error; failed, malformed or nonempty verification returns fixed500. No lookup failure can silently report deletion. Zero existing shares remain idempotent. Credentials/RLS scope stay user-bound.

A single filtered UPDATE handles multiple active rows without the old select-single ambiguity. The later bounded SELECT asks for at most one surviving id. The Go type assertion data.([]any) distinguishes a JSON list from null or an object; only an empty list permits success. Verification is conservative: another share created before that read may cause a failure rather than a false success. These calls do not make the service transactional. Existing exercises are untouched.
