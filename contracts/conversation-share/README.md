# Conversation share contract

Update BUG-055 (R-089,2026-10-30): contract v2. Creating, removing and forking a share now return fixed failure text: Share operation failed for existing400 responses and Internal server error for500. Status codes, authorization and not-found replies stay pinned. No database, library, transport or parser details are sent to visitors. Rollback Next.js answers remain in next_expect.


**Version 1** (SHARE-002, 2026-10-17): 45 cases, 14 marked `defect`, over the two methods of `/api/conversations/[id]/share`:

- `POST` creates or renews the share link of one's own conversation;
- `DELETE` marks one's own share deleted.

The share dialog (`src/components/ShareDialog.jsx`) calls both.

```text
node --test scripts/contracts/conversation-share.test.mjs
npm run test:contracts
cd backend && go test -count=1 -run ConversationShare ./internal/shares/
```

## How it was recorded

`scripts/contracts/record-conversation-share.mjs` runs the real Next.js handlers through the shared runner `scripts/contracts/route-db-fixture.mjs`: the real supabase-js 2.78 with only `fetch`, `auth.getUser()` and `auth.getSession()` replaced. For this contract the runner gained:

- `params`, the path's parameters as Next.js hands them to the handler, decoded (the request's path holds them percent-encoded);
- `site_url`, `NEXT_PUBLIC_SITE_URL` while the handler runs.

A case marked `engine_message` pins the status and that the body is `{"error": text}`, but not the text. That text is a JSON parse error written by the JavaScript engine, and it differs between Node versions. `scripts/contracts/engine-message.mjs` makes the comparison.

## Recorded behaviour

- **Order:** the client is built first (without the project's settings it throws, and its message is sent: 500), then sign-in (401 `Unauthorized`). Only then is the body read, so a signed-out request with a broken body is 401.
- **POST:**
  - The body is read with `request.json()`. Text that is not JSON is 500 with the parse error's own message: `Unexpected end of JSON input` for an empty body.
  - `{ isPublic = true, title, summary } = body || {}`: `isPublic` defaults only when missing, so `false` and `null` are kept. A body of `null` or text has no fields.
  - The conversation is read as the user's own (`id` and `user_id`, one row). Any failure, or no row, is 404 `Conversation not found`.
  - `upsert_shared_conversation` is called as the user with `p_conversation_id`, `p_is_public`, `p_title` (`title || conv.title`, left out when both are missing), `p_summary` (`summary || null`) and `p_snapshot` (the last 50 messages, or `[]` when they are not a list).
  - A failed call is 400 with supabase-js's `error.message`: the database's own message, the text of a reply that is not JSON, or `TypeError: fetch failed`. A refusal without a message gives `{}`.
  - The link is `(NEXT_PUBLIC_SITE_URL || the request's origin)` with one trailing slash dropped, then `/s/` and the share's `share_token` as text: `undefined` when there is none, as for a list or `false`. A share of `null` throws: 500 `Cannot read properties of null (reading 'share_token')`.
  - The answer is `{ share, url }`.
- **DELETE:** the user's active share of the conversation is read as one row. **Defect** (R-090): if that read fails for any reason (a database error, no reply, or two active shares) the answer is `{ ok: true }` and nothing is removed, so the dialog reports the link deleted while it still works. A found share is updated with `deleted_at` (the current time), by its id. A failed update is 400 with `error.message`.
- **Defects** (R-089): the database's messages, supabase-js's, a TypeError's, a JSON parse error's and the client library's reach the browser as they are.
- No `Cache-Control` is set.

## The Go port

`backend/internal/shares` (`Conversation`), off by default; the switch is `conversation-share`. It passes all 45 cases. New shared pieces: `supabaserest.ErrorMessage`, `supabaserest.MissingSettings` (moved from `sharetoken`) and `jscompat.JSONParseMessage`.

Where it differs, outside these cases (see `backend/README.md`, "Shares (SHARE-002)"):

- a body that is not JSON gets Go's fixed message, except an empty or blank one, which gets V8's own;
- the link starts with `NEXT_PUBLIC_SITE_URL` from the Go server's environment; without it, with the forwarded host and scheme (`X-Forwarded-Host`, `X-Forwarded-Proto`) or the request's own;
- bodies are limited to 1 MiB;
- it reads a bearer, not the session cookie.


BUG-068/R-090 (2026-10-31): contract v3. R-090 now updates all active shares matching both caller and conversation, then verifies an empty active-share list before reporting ok. Failed writes return the existing fixed400 error; failed, malformed or nonempty verification returns fixed500. No lookup failure can silently report deletion. Zero existing shares remain idempotent. Credentials/RLS scope stay user-bound. Original Next.js replies/database calls remain in next_expect/database; Go replies use go_database.
