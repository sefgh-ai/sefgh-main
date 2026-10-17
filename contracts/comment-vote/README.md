# Comment vote contract

**Version 1** (CVOTE-001, 2026-10-17): 25 cases, none marked `defect`, over `GET` and `POST /api/repo/comments/vote`. `POST` records an upvote or downvote on a comment, or removes it. `GET` answers the caller's own vote. The arrows beside each comment (`src/components/repo-details/RepoCommentsSection.jsx`) call `POST`; nothing in the browser calls `GET`.

```text
node --test scripts/contracts/comment-vote.test.mjs
npm run test:contracts
cd backend && go test -count=1 ./internal/commentvote/
```

## How it was recorded

`scripts/contracts/record-comment-vote.mjs` runs the real Next.js handlers through the shared runner `scripts/contracts/route-db-fixture.mjs`: the real supabase-js 2.78 with only `fetch` and `auth.getUser()` replaced. The inputs and dispositions are written by hand.

## Recorded behaviour

- **POST** checks, in order:
  - sign-in: 401 `Unauthorized. Please login to vote.`;
  - the body: 500 when it is not JSON or is `null`;
  - `commentId`: 400 `Comment ID is required`;
  - the vote type: 400 `Invalid vote type` for a truthy `voteType` that is not exactly `upvote` or `downvote`.
- **The write:** a truthy `voteType` is upserted as the user (`on_conflict=user_id,comment_id`), and a falsy one deletes the user's vote. A failed write is 500 `Failed to save vote` or `Failed to remove vote`.
- **The reply:** the comment's counts are read as one row, and that read's error is ignored. The reply is `{ success: true, upvotes: comment?.upvotes || 0, downvotes: comment?.downvotes || 0, userVote: voteType }`. Truthy counts pass through as stored, and an undefined `voteType` is left out.
- **GET** checks `commentId` first (400). A visitor who is not signed in, or whose session Auth refuses, gets `{ "userVote": null }` without a database request. A signed-in visitor's vote is read as one row, and `vote_type || null` is `userVote`; the read's error is ignored.
- No `Cache-Control` is set.

## The Go port

`backend/internal/commentvote`, off by default; the switch is `comment-vote`. It passes all 25 cases.

Where it differs, outside these cases:

- it reads a bearer, not the session cookie;
- a POST body over 1 MiB is answered as unreadable;
- other methods get Go's 405.
