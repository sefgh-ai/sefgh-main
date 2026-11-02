# Share fork contract

P7-03 (2026-11-02): the matching Next.js handler and its recorders/runners
are retired. All23cases and their Go-relevant inputs/expected answers remain
unchanged at the existing contract version. `next_*` rollback fields are
removed. Node checks fixture integrity; Go still executes every case and its
runtime authorization/mux tests. The URLs reach Go without per-route switches
when SEFGH_GO_API_URL is configured, and are404 without that origin.
Rollback requires reverting the P7-03 commit and redeploying both projects.
Earlier Next.js parity/recorder/rollback descriptions below are historical
at parent `18b921e`; they are not current executable commands.


Update BUG-055 (R-089,2026-10-30): contract v2. Creating, removing and forking a share now return fixed failure text: Share operation failed for existing400 responses and Internal server error for500. Status codes, authorization and not-found replies stay pinned. No database, library, transport or parser details are sent to visitors. Rollback Next.js answers remain in next_expect.


**Version 1** (SHARE-002, 2026-10-17): 23 cases, 7 marked `defect`, for `POST /api/share/[token]/fork`, which copies a public shared conversation into the signed-in user's own conversations. The shared page's "continue" button (`src/app/s/[token]/page.js`) calls it.

```text
node --test scripts/contracts/share-fork.test.mjs
npm run test:contracts
cd backend && go test -count=1 -run ShareFork ./internal/shares/
```

It was recorded by `scripts/contracts/record-share-fork.mjs` with the shared runner, as `contracts/conversation-share` was; see that contract's README for `params` and `engine_message`.

## Recorded behaviour

- The client is built first (without the project's settings, 500 with the library's message), then sign-in (401 `Unauthorized`); the body is never read.
- The share is read by its token, not deleted, as one row. Any failure, no row, or a row whose `is_public` is not true to JavaScript is 404 `Not found or private`. A list has no `is_public`.
- A new conversation is inserted as the user, with `title || 'Shared Conversation'`, the snapshot as its messages (or `[]` when it is not a list), and the model `gpt-4o`, asking back for its `id` only.
- A failed insert is 400 with supabase-js's `error.message`, as for the conversation share. An insert that answers `null`, or no body, makes `conv.id` throw: 500 `Cannot read properties of null (reading 'id')`.
- The answer is `{ conversationId }`, which is `{}` when the new row has no id.
- **Defects** (R-089): the database's, supabase-js's, a TypeError's and the client library's messages reach the browser as they are.
- No `Cache-Control` is set.

## The Go port

`backend/internal/shares` (`Fork`), off by default; the switch is `share-fork`. It passes all 23 cases. It reads a bearer, not the session cookie; the shared page sends one (`fetchWithSession`).
