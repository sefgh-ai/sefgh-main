# Repository rating contract

Update BUG-051 (R-085,2026-10-30): contract v3. Rating writes accept only JSON numbers that are whole values 1 through 5. Text, booleans, lists, objects and fractions return 400 before any database write. Existing stored-rating summaries remain characterized. Rollback Next.js answers remain in next_expect.


Update BUG-050 (R-084,2026-10-30): contract v2. Auth outages now return 503 with fixed text Sign-in could not be verified before any database request in collect, vote, rating, comment votes, comment writes and video writes. Refused sessions retain their existing policy. Rollback Next.js answers remain in next_expect.


**Version 1** (RATING-001, 2026-10-17): 52 cases, 8 marked `defect`, over `GET`, `POST` and `DELETE /api/repo/rating`:

- `POST` rates a repository from 1 to 5, with an optional review;
- `DELETE` removes the user's rating;
- `GET` answers every rating with the total, the average and the visitor's own.

The rating form (`src/components/repo-details/RepoRatingSection.jsx`) calls `POST`. Nothing in the browser calls `GET` or `DELETE`.

```text
node --test scripts/contracts/repo-rating.test.mjs
npm run test:contracts
cd backend && go test -count=1 ./internal/rating/
```

## How it was recorded

(Historical: the Next.js handlers and this recorder were retired in P7-05, and every `next_*` field was removed from the cases; Go's tests run every case.) `scripts/contracts/record-repo-rating.mjs` ran the real Next.js handlers through `scripts/contracts/route-db-fixture.mjs`, the shared runner of the vote contract. That is the real supabase-js 2.78 with only `fetch` and `auth.getUser()` replaced, and the clock fixed at `2026-10-17T09:30:00.000Z`. The inputs and dispositions are written by hand.

## Recorded behaviour

- **POST** checks, in order:
  - sign-in: 401 `Unauthorized. Please login to rate.`;
  - the body: 500 when it is not JSON or is `null`;
  - `repoFullName`: 400;
  - the rating: `!rating || rating < 1 || rating > 5` gives 400 `Rating must be between 1 and 5`.

  The rating is upserted as the user (`on_conflict=user_id,repo_full_name`, `review_text: reviewText || null`, `updated_at` from the clock). Then every rating of the repository is read back. A failed upsert is 500 `Failed to save rating`; a failed read is 500 `Failed to fetch updated ratings`.
- **The average** is `Math.round((sum / total) * 10) / 10`, where `sum` is `reduce((sum, r) => sum + r.rating, 0)`. NaN and Infinity are written as `null`. A null row throws (500), and so does a read that is not a list but has a length above 0, since it has no `reduce()`.
- **Defects** (bug register R-085): the check turns the rating into a number first, so:
  - the text `"5"`, `" 5 "` or `"0x5"`, the list `[3]`, `true` and any object pass;
  - `"great"` (NaN) passes every comparison, and only the database refuses it;
  - a rating that reaches the average as text joins the sum as text, so `0 + "3" + 4` is `"034"` and the average is 17.
- **GET** checks `repo` first (400), then reads every rating (`select *`) with the visitor's token or the public key. A read error is 500 `Failed to fetch ratings`. A signed-in visitor's own row is read as one row and passed through as `userRating`, or `null`. `allRatings` is the rows as read, or `[]`.
- **DELETE** checks sign-in (401 `Unauthorized`), then `repo` (400), and deletes the user's rating of that repository. A failure is 500 `Failed to delete rating`.
- No `Cache-Control` is set. Ratings are readable by everyone (`database/user-db.md`), so the totals are right.

## The Go port

`backend/internal/rating`, off by default; the switch is `repo-rating`. It passes all 52 cases. JavaScript's loose rules come from `jscompat`:

- `Number` and `StringToNumber` for the check;
- `Add` for the sum;
- `MathRound` and `NumberJSON` for the average.

Every expected value in their tests came from Node.

Where it differs, outside these cases (see `backend/README.md`, "Rating (RATING-001)"): it reads a bearer, not the session cookie; a POST body over 1 MiB is answered as unreadable; and methods other than GET, HEAD, POST and DELETE get Go's 405.
