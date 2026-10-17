# Lesson 26: Three kinds of nothing, and one deadline for several calls

**You will learn:** the difference between JavaScript's `undefined`, `null` and other falsy values, and how Go keeps them apart. You will also see how one deadline can cover several calls in a row, and how both languages' tests can stop the clock.

**Real code:** `backend/internal/vote/handler.go` (the port of `/api/repo/vote`), `RequestFields`, `TruthyJSON` and `ISOString` in `backend/internal/jscompat/request.go`, and `TestHandlersFinishInsideTheWriteTimeout` in `backend/cmd/api/main_test.go`.

## The problem in the app

The up and down arrows on a repository send `POST /api/repo/vote` with `voteType` set to `"upvote"`, `"downvote"`, or `null` to take the vote back. After saving, the handler asks the database function `get_repo_vote_stats` for the new counts. The live database has no such function (bug register R-076), so that call always fails. The handler then counts the votes itself. The Go port does the same, failing call included, so the two can be compared before the switch.

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

Each database call may take up to 10 seconds, and the server must answer within 30 (lesson 21). A vote can make three calls after the 4-second sign-in check: save the vote, ask for the stats, count. That is 4 + 30 = 34 seconds, which is too long.

No one had to notice this by hand. `TestHandlersFinishInsideTheWriteTimeout` adds up every route's worst case, and it failed the moment the vote route was wired in:

```text
sign-in, a vote, the stats call and a count can take 34s, which is not below the server's write timeout of 30s
```

The fix is one deadline for all three calls, set once before the first:

```go
ctx, cancel := context.WithTimeout(r.Context(), budget)
defer cancel()
```

Each call gets this same `ctx`. When 24 seconds are used up, whatever call is running is cancelled, and the ones after it fail at once. Lesson 23 used the same idea for goroutines running side by side; here the calls run one after another. `TestBudgetBoundsAHangingStatsCall` makes the stats call hang and checks that the reply still arrives quickly.

## Stopping the clock

A vote stores `updated_at: new Date().toISOString()`, so every run of the handler writes a different time. To record the contract, the Node runner (`scripts/contracts/route-db-fixture.mjs`) swaps `Date` for one that always says 2026-10-17 at 09:30 UTC. The Go handler takes its clock as a field, `Now func() time.Time`, and the contract test passes a function that returns that same moment. `jscompat.ISOString` writes it the way JavaScript does: `2026-10-17T09:30:00.000Z`, always in UTC, always with milliseconds.

## One copy of the shared rules

Lesson 25's collect route had small helpers: read the body like `const { a, b } = await request.json()`, and decide whether a JSON value is truthy. The vote route needs the same, so they moved into `jscompat`, and both routes now call `jscompat.RequestFields` and `jscompat.TruthyJSON`. The rating and comment routes will too.

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
