# Lesson 26: Three kinds of nothing, and one deadline for several calls

**You will learn:** the difference between JavaScript's `undefined`, `null` and other falsy values, and how Go keeps them apart. You will also see how one deadline can cover several calls in a row, and how both languages' tests can stop the clock.

**Real code:** `backend/internal/vote/handler.go` (the port of `/api/repo/vote`), `backend/internal/commentvote/handler.go`, `RequestFields`, `TruthyJSON` and `ISOString` in `backend/internal/jscompat/request.go`, and `TestHandlersFinishInsideTheWriteTimeout` in `backend/cmd/api/main_test.go`.

## The problem in the app

The up and down arrows on a repository send `POST /api/repo/vote` with `voteType` set to `"upvote"`, `"downvote"`, or `null` to take the vote back. The old handler first calls a missing database function, then counts the votes when that fails. BUG-037 (R-076) removes that failed call from Go: after saving, Go reads the rows and counts directly. The Next.js rollback handler keeps its old behavior, checked separately by contract version 2.

The Go test fixture has `GoDatabase *[]answer`: a pointer to a slice. A nil pointer means "use the shared replies"; a pointer to an empty slice means "Go has its own empty reply list". In JavaScript this choice is `fixture.go_database ?? fixture.database`. Separate lists let Go skip a call without shifting the answers that the old handler receives.

## Three kinds of nothing

The handler ends with:

```js
return NextResponse.json({ success: true, votes, userVote: voteType })
```

What the browser receives depends on which kind of "nothing" `voteType` holds:

| The visitor sent | `voteType` | The reply has |
|---|---|---|
| `"voteType": null` | `null` | `"userVote": null` |
| `"voteType": ""` | `""` (falsy, but a value) | `"userVote": ""` |
| no `voteType` at all | `undefined` | no `userVote` at all |

`JSON.stringify` leaves out a field whose value is `undefined`. Go has no `undefined`, so the port keeps the visitor's raw JSON (`json.RawMessage`) and uses Go's own "nothing", `nil`, for "not sent":

```go
if voteType != nil {
	reply.WriteString(`,"userVote":`)
	reply.Write(voteType)
}
```

A `json.RawMessage` holding the four letters `null` is not `nil`: it is a real JSON null, and it is written. `jscompat.RequestFields` gives exactly this. A field the body did not have is missing from the map, so reading it gives `nil`. All three kinds are cases in the contract.

## One deadline for several calls

Each database call may take up to 10 seconds, and the server must answer within 30 (lesson 21). The original port made three calls after the 4-second sign-in check: save the vote, ask for the stats, count. That was 4 + 30 = 34 seconds, which was too long. Go now makes only the write and count, retaining the existing 24-second overall budget.

No one had to notice this by hand. `TestHandlersFinishInsideTheWriteTimeout` adds up every route's worst case, and it failed the moment the vote route was wired in:

```text
sign-in, a vote, the stats call and a count can take 34s, which is not below the server's write timeout of 30s
```

The fix is one deadline for all three calls, set once before the first:

```go
ctx, cancel := context.WithTimeout(r.Context(), budget)
defer cancel()
```

Each call gets this same `ctx`. When 24 seconds are used up, whatever call is running is cancelled, and the ones after it fail at once. Lesson 23 used the same idea for goroutines running side by side; here the calls run one after another. `TestBudgetBoundsAHangingCount` makes the count hang and checks that the reply still arrives quickly. The existing exercise below still practices missing, null and empty values; leave your `exercise.go` work in place.

## Stopping the clock

A vote stores `updated_at: new Date().toISOString()`, so every run of the handler writes a different time. To record the contract, the Node runner (`scripts/contracts/route-db-fixture.mjs`) swaps `Date` for one that always says 2026-10-17 at 09:30 UTC. The Go handler takes its clock as a field, `Now func() time.Time`, and the contract test passes a function that returns that same moment. `jscompat.ISOString` writes it the way JavaScript does: `2026-10-17T09:30:00.000Z`, always in UTC, always with milliseconds.

## One copy of the shared rules

Lesson 25's collect route had small helpers: read the body like `const { a, b } = await request.json()`, and decide whether a JSON value is truthy. The vote route needs the same, so they moved into `jscompat`, and both routes now call `jscompat.RequestFields` and `jscompat.TruthyJSON`. The rating and comment routes will too.

## The same ideas, again: votes on comments

`backend/internal/commentvote` ports `/api/repo/comments/vote`, the arrows beside each comment. It needed nothing new, which is the point of the shared helpers:

- `jscompat.RequestFields` reads the body;
- `jscompat.TruthyJSON` copies `voteType && ...`;
- a `nil` `voteType` leaves `userVote` out of the reply, as above.

One more small helper moved into `jscompat` on the way. `comment?.upvotes || 0` and `vote?.vote_type || null` have the same shape, "a field when it is truthy, or a fallback", so both routes call `jscompat.FieldOr`:

```go
upvotes = jscompat.FieldOr(raw, "upvotes", upvotes)
```

When a third piece of code needs the same few lines, it is usually time to give them a name.

## Your turn

Open `exercise.go` and write `reply`. The tests come from running `JSON.stringify` in Node: an undefined vote disappears, while `null` and `""` stay.

```text
go test ./26-three-kinds-of-nothing
go test -tags solution ./26-three-kinds-of-nothing
```

## You now know

- JavaScript has `undefined`, `null` and other falsy values, and `JSON.stringify` leaves out only `undefined`.
- In Go, a `nil` `json.RawMessage` can stand for "not sent", and the text `null` for a real null.
- One `context.WithTimeout` can bound several calls made one after another.
- A test that adds up worst cases catches a slow design before it ships.
- A clock passed in as a function lets a test stop time.
