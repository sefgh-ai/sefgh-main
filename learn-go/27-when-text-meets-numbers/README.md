# Lesson 27: When text meets numbers

**You will learn:** how JavaScript compares and adds values of different kinds, why `"5" < 6` and `0 + "3"` surprise people, and how to copy those rules in Go, including rounding exactly as `Math.round` does.

**Real code:** `backend/internal/rating/handler.go` (the port of `/api/repo/rating`), and `Number`, `StringToNumber`, `Add` and `MathRound` in `backend/internal/jscompat/number.go`.

## The problem in the app

The star rating on a repository sends `POST /api/repo/rating` with a number from 1 to 5. The Next.js handler checks it like this:

```js
if (!rating || rating < 1 || rating > 5) { /* 400 */ }
```

and averages every rating:

```js
allRatings.reduce((sum, r) => sum + r.rating, 0) / total
```

The page always sends a whole number, so these lines work for it. But anyone can send something else, and the Go port must answer exactly as Next.js does. That means copying JavaScript's rules for values that are not numbers.

## Comparing: text becomes a number first

`rating < 1` turns `rating` into a number before comparing. JavaScript's rules for that are generous:

| `rating` | as a number | passes the check? |
|---|---|---|
| `"5"` | 5 | yes |
| `" 5 "` | 5 (space around it is ignored) | yes |
| `"0x5"` | 5 (hexadecimal!) | yes |
| `[3]` | 3 (the list becomes `"3"` first) | yes |
| `"great"` | NaN | **yes**: every comparison with NaN is false |
| `[]` | 0 | no |

So `"great"` sails through and only the database stops it. That is bug R-085. The port keeps it for now, so the two backends can be compared.

`jscompat.StringToNumber` copies the rules. Go's own `strconv.ParseFloat` accepts things JavaScript does not, such as `"inf"` and `"1_000"`, so the code first checks the text has the exact shape of a JavaScript number, then parses it.

## Adding: text wins

In JavaScript, `+` adds two numbers but **joins** text:

```js
0 + 4        // 4
0 + "3"      // "03": text joined to text
"03" + 4     // "034"
Number("034") / 2   // 17
```

So if one rating were stored as the text `"3"`, the average of `"3"` and `4` would come out as 17. `jscompat.Add` follows the same rule. First a list or an object becomes text. Then, if either side is text, the two are joined; otherwise they are added as numbers. A row with no rating adds `undefined`, which makes the sum NaN, and `JSON.stringify` writes NaN as `null`. The contract checks every one of these cases against the real handler.

## Rounding to one decimal

The average is rounded with:

```js
Math.round(average * 10) / 10
```

`Math.round` takes a value exactly halfway **up**, toward +Infinity: 2.5 becomes 3, but -2.5 becomes -2. Go's `math.Round` takes a half away from zero instead, so -2.5 would be -3. The well-known trick `math.Floor(x + 0.5)` has its own problem: for 0.49999999999999994 the addition rounds up to exactly 1.0 before `Floor` sees it. So `jscompat.MathRound` rounds down first, then looks at what is left over. That's your exercise.

## Checking it against JavaScript

The contract `contracts/repo-rating` (52 cases) was recorded by running the three real Next.js handlers. Every expected value in `number_test.go` came from running the same expression in Node: `Number(...)`, the `reduce` sum, `Math.round`. Five deliberate mistakes in the Go handler were each caught by the contract. Among them: accepting only real numbers, adding as numbers only, and writing NaN as text.

## Your turn

Open `exercise.go` and write `mathRound`.

```text
go test ./27-when-text-meets-numbers
go test -tags solution ./27-when-text-meets-numbers
```

## You now know

- JavaScript turns text into a number before comparing it with a number, and white space, `0x` and lists all play a part.
- Any comparison with NaN is false, so a check written as "refuse if too small or too large" lets NaN through.
- `+` joins text as soon as one side is text.
- `Math.round`, Go's `math.Round` and `Floor(x + 0.5)` are three different roundings.


## BUG-051: R-085

Rating writes accept only JSON numbers that are whole values 1 through 5. Text, booleans, lists, objects and fractions return 400 before any database write. Existing stored-rating summaries remain characterized.

The real backend and fixtures pin this change. Go returns early for errors and keeps the user's request scope. The regression was shown failing before the fix and under a deliberate break. Existing exercise.go files are untouched; lesson checks remain optional.

The POST boundary now uses json.Unmarshal(raw, &n) with a float64 variable. Unlike Number(value) in JavaScript, decoding a JSON string or boolean into float64 returns an error. The range check rejects null (decoded as zero); math.Trunc(n) != n rejects fractions. The older coercion examples describe stored data and the retired rollback handler, not permission to store new coerced ratings.
