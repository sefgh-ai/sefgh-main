# Repository comments contract

Update BUG-052 (R-087,2026-10-30): contract v5. Comment edits/deletions and video deletions return404 for zero visible matches, covering missing and unowned items without revealing ownership. Deletes request their row in the same owner-filtered mutation. Other database errors, including multiple-row single-object errors, retain fixed500 responses. Rollback Next.js answers remain in next_expect.


Update BUG-050 (R-084,2026-10-30): contract v4. Auth outages now return 503 with fixed text Sign-in could not be verified before any database request in collect, vote, rating, comment votes, comment writes and video writes. Refused sessions retain their existing policy. Rollback Next.js answers remain in next_expect.


**Version 3** (BUG-028a, 2026-10-28): 52 cases. Authors come from their public profile (R-040, R-075, the owner's option A): the profile read asks for `full_name,avatar_url`, `user_name` is `full_name`, there is no admin lookup, and `user_email` is `null` for every listed comment (a new comment still carries the poster's own email). So an author id that is not a UUID no longer fails the list (`get-user-id-not-uuid` answers 200). In `get-profile-present` and `post-profile-present` the stand-in profile now holds `full_name`. Fourteen cases changed; each keeps the Next.js handler's answer as `next_expect` (recorded by running it for the two profile cases) until that handler is retired.

**Version 2** (BUG-026, 2026-10-28): 52 cases. A page holds at most 50 comments (R-086, the owner's option A): `get-limit-capped` and `get-limit-capped-with-offset` send `limit=50` for 51 and 1000. Text that is not a number and numbers below one are unchanged. Go only: the Next.js handler sends the limit as given until it is retired, and `scripts/contracts/repo-comments.test.mjs` converts those two cases for it.

**Version 1** (COMMENTS-001, 2026-10-17): 50 cases, 6 marked `defect`, over the four methods of `/api/repo/comments`:

- `GET` answers a page of a repository's comments, or one comment's replies, each with its author and reply count;
- `POST` adds a comment or a reply;
- `PATCH` edits one's own comment;
- `DELETE` marks one's own comment deleted.

The comments section (`src/components/repo-details/RepoCommentsSection.jsx`) calls `POST`, `PATCH` and `DELETE`. The list it shows is read in the browser (`src/lib/utils/repo/commentHelpers.js`), not through `GET`.

```text
node --test scripts/contracts/repo-comments.test.mjs
npm run test:contracts
cd backend && go test -count=1 ./internal/comments/
```

## How it was recorded

(Historical: the Next.js handlers and this recorder were retired in P7-05, and every `next_*` field was removed from the cases; Go's tests run every case.) `scripts/contracts/record-repo-comments.mjs` ran the real Next.js handlers through the shared runner `scripts/contracts/route-db-fixture.mjs`. That is the real supabase-js 2.78 with only `fetch`, `auth.getUser()` and `auth.getSession()` replaced, so the Data API gets the visitor's token and the auth admin API gets the public key, as with the real cookie client. The clock is fixed at `2026-10-17T09:30:00.000Z`.

GET makes its per-comment requests at the same time. Its cases therefore answer by `routes`, matched on `METHOD path?query`, and its requests are compared in any order. The runner gained `routes`, reply headers and PATCH bodies for this contract; the vote, rating and comment-vote contracts pass unchanged with it.

## Recorded behaviour

- **GET** checks `repo` first (400). It reads `select *`, not deleted, newest first, with `offset` and `limit` from `parseInt(limit || '50')` and `parseInt(offset || '0')`. So `" 7px"` is 7, `"0x10"` is 16, and text that is not a number is sent as `NaN`. It then reads `parent_id=is.null`, or `eq.<parentId>`; the text `"null"` means none.
  - A read error is 500 `Failed to fetch comments`. A reply that is not a list has no `map()`: 500.
- **For every comment, at the same time:**
  - the author's profile is read as one row;
  - with no profile, an admin lookup `auth.admin.getUserById` follows;
  - the replies are counted with `HEAD` and `Prefer: count=exact`.

  The reply is `{ ...comment, user_name, user_email, user_avatar, reply_count }`. `user_email` is `null` when a profile was found, and otherwise the admin lookup's email, which is undefined and so left out.
- **Defects** (bug register R-075, R-040):
  - the profile read asks for `username`, which does not exist, so it always fails;
  - the admin lookup goes with the public key and is always refused;
  - so names, avatars and emails never show.

  Were the admin lookup ever to succeed, it would send every author's email to anyone.
- **Throws:** a null comment, or an author id that is not a lower-case UUID (auth-js `validateUUID`), makes `Promise.all` reject: 500 for the whole list.
- **POST** checks, in order:
  - sign-in: 401 `Unauthorized. Please login to comment.`;
  - the body: 500 when it is not JSON or is `null`;
  - `repoFullName`: 400;
  - `commentText`: 400 when missing or only white space after JavaScript's `trim()`, and 500 when it is not text (no `trim()`);
  - a parent, when `parentId` is given: 404 `Parent comment not found`.

  The comment is inserted as the user and returned as stored, with the user's email from Supabase Auth. A failed insert is 500 `Failed to post comment`.
- **PATCH** checks sign-in (401 `Unauthorized`), `commentId` (400) and `commentText` (400), then updates only the user's own row and returns it. **Defect** (R-087): someone else's comment, or none, matches no row, which is a 406 here, so the answer is 500 `Failed to update comment`, not 404.
- **DELETE** checks sign-in (401) and `id` (400), then sets `is_deleted` and `[deleted]` on the user's own row. **Defect** (R-087): someone else's comment matches no row, which is not an error, so the answer is success.
- No `Cache-Control` is set.

## The Go port

`backend/internal/comments`, off by default; the switch is `repo-comments`. It passes all 50 cases (52 since version 2). The new pieces:

- `supabaserest.InsertReturning`, `Update`, `Count` and `AdminUser`;
- `jscompat.ParseInt`, `Spread` and `Assign`;
- `githubaccess.Verifier.UserEmail`.

Where it differs, outside these cases (see `backend/README.md`, "Comments (COMMENTS-001)"):

- at most four comments have their details read at once, all within one 16-second budget, and a lookup cut short reads as failed;
- the first comment that makes `Promise.all` reject cancels the rest, where Next.js lets them run on unobserved;
- a POST's three database calls share a 20-second budget;
- bodies are limited to 1 MiB;
- it reads a bearer, not the session cookie.
