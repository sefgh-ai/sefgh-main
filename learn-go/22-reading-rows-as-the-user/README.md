# Lesson 22: Reading rows as the user

**You will learn:** how Go asks the database for a user's own rows without any server password, how to put a value into a URL safely, why Go and JavaScript round 0.25 differently and how to round exactly, and how a Go test can check itself against the JavaScript it replaces.

**Real code:** `backend/internal/activity` (the port of `GET /api/activity`), `Select` in `backend/internal/supabaserest`, `ToFixed` in `backend/internal/jscompat/tofixed.go`, and `User` in `backend/internal/githubaccess/session.go`.

## The problem in the app

Your profile page shows a year of activity, like GitHub's green squares. The browser asks `GET /api/activity`, and the server reads your rows from the `activity_logs` table. This is the first route in Go that reads the database. Everything before it read GitHub or an AI provider.

The database must hand back your rows and nobody else's. Supabase decides that with row-level security: rules in the database that look at who is asking. So the important question is not "how does Go reach the database" but "who does Go say it is".

## Asking as the user

The Next.js handler does this with supabase-js:

```js
const { data, error } = await supabase
  .from('activity_logs')
  .select('activity_date, activity_count')
  .eq('user_id', user.id)
```

`supabase` here was built from your session cookie, so the request carries your access token. Supabase turns that chain into one HTTP request to its Data API. Go sends the same request itself, in `Select`. It lives in its own package, `backend/internal/supabaserest`, because the starred route (lesson 23) needed it too:

```go
req.Header.Set("apikey", c.Key)                     // the project's public key
req.Header.Set("Authorization", "Bearer "+session)  // your own access token
```

Two headers, two jobs. The public key says which project; anyone may know it. Your token says who is asking, and the database's rules read it. Go never holds a key that could read everyone's rows (Supabase calls that one the service key), so a mistake in Go cannot leak another user's activity: the database would refuse.

Where does `session` come from? `Verifier.User` asks Supabase who the bearer token belongs to and hands back both your id and the token:

```go
userID, session, status := h.User(r)
```

A function can return several values in Go. JavaScript would return an object, `{ id, session, status }`, and you would pull it apart; Go does it in one line.

## Putting a value into a URL safely

supabase-js writes `.eq('user_id', id)` as `user_id=eq.<id>` in the URL. Go writes it like this, in `askDatabase`:

```go
supabaserest.Param("user_id", "eq."+userID),
```

`Param` puts the value through `jscompat.FormEncode`, which turns any character that means something in a URL (`&`, `=`, `?`, a space) into a `%` code. Without it, an id containing `&order=...` would add a second instruction to the query. A test, `TestTheQueryIsTheUsersOwn`, sends exactly such an id and checks the database receives it as one value. This is the same idea as `encodeURIComponent` in JavaScript, which lesson 03 rebuilt. (`Param` first used Go's `url.QueryEscape`; lesson 24 explains why it now copies the browser's `URLSearchParams` instead.)

## Rounding: 0.25 is "0.3" in JavaScript and "0.2" in Go

The reply includes `averagePerDay`, worked out in JavaScript as:

```js
parseFloat((totalContributions / totalDays).toFixed(1))
```

Go's nearest tool is `strconv.FormatFloat(x, 'f', 1, 64)`. It agrees almost always, but not when `x` sits exactly halfway between two answers. Then Go picks the even digit and JavaScript picks the larger number:

| x | JavaScript `toFixed(1)` | Go `FormatFloat` |
|---|---|---|
| 0.25 | 0.3 | 0.2 |
| 0.75 | 0.8 | 0.8 |
| 0.35 | 0.3 | 0.3 |

Why is 0.35 not a tie? A `float64` cannot hold 0.35 exactly. It holds 0.34999999999999997779..., which is below halfway, so both say 0.3. 0.25 is held exactly, so it is a true tie.

To copy JavaScript, `ToFixed` works on the exact value with `math/big`. A `big.Rat` is a fraction of two whole numbers of any size, so nothing is rounded along the way:

```go
scaled := new(big.Rat).SetFloat64(x)                 // the exact value, as a fraction
scaled.Mul(scaled, ten)                              // x * 10
scaled.Add(scaled, big.NewRat(1, 2))                 // + 1/2
n := new(big.Int).Quo(scaled.Num(), scaled.Denom()) // whole part: floor
```

"Add a half, then drop the fraction" rounds to the nearest whole number, and a tie goes up: 2.5 + 0.5 is exactly 3. That is the rule JavaScript's specification gives for `toFixed`.

Could a real user hit this? Yes: 92 actions in a 368-day grid is exactly 0.25 a day.

## Testing against the original

The contract has twelve cases, and the Go port passed all twelve with Go's own rounding. None of them has an average that falls exactly halfway. So `node_test.go` runs the real Next.js handler too:

```go
cmd := exec.Command(node, "scripts/contracts/activity-run.mjs")
cmd.Stdin = bytes.NewReader(input)
output, err := cmd.Output()
```

`os/exec` starts another program, here Node, the way a terminal would. The test makes 400 inputs (every weekday, leap years, odd counts, halfway averages), sends them to both handlers, and compares every answer. The inputs come from `math/rand/v2` with a fixed seed, `rand.NewPCG(2026, 1014)`, so they are the same 400 on every run and a failure can be repeated.

With `FormatFloat` in place of `ToFixed`, 24 of the 400 failed. With `ToFixed`, all pass. Without Node installed, the test says so and skips with `t.Skip` instead of failing.

## Your turn

Open `exercise.go` and write `tenths`: how many tenths `x` is, rounded the way `toFixed(1)` rounds. For example `tenths(0.25)` is 3, `tenths(1.45)` is 14, and `tenths(999.95)` is 10000. `x` is never negative.

1. Make the exact fraction: `new(big.Rat).SetFloat64(x)`.
2. Multiply it by 10, then add one half, `big.NewRat(1, 2)`.
3. Divide the numerator by the denominator with `new(big.Int).Quo(...)`, and return the result as an `int64` with its `Int64()` method.

```text
go test ./22-reading-rows-as-the-user
go test -tags solution ./22-reading-rows-as-the-user
```

## You now know

- Asking the database with the user's own token, and only the public key besides, keeps the database's own rules in charge.
- A function can return several values; `User` returns the id, the token and a status.
- Encoding a value keeps it from changing the meaning of a URL.
- Go rounds a tie to even, JavaScript's `toFixed` rounds it up; `math/big` lets you round on the exact value.
- A Go test can run the JavaScript it replaces with `os/exec`, and a fixed random seed makes many generated cases repeatable.
