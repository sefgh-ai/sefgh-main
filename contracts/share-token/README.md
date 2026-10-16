# Shared conversation contract

**Version 1** (SHARE-001, 2026-10-16): 17 cases, 5 marked `defect`. `GET /api/share/[token]` answers one shared conversation by the token in its link. The shared-chat page (`src/app/s/[token]/page.js`) reads it, and treats any answer that is not 200 the same way: "This shared chat is unavailable", then the home page.

```text
node --test scripts/contracts/share-token.test.mjs
npm run test:contracts
cd backend && go test -count=1 ./internal/sharetoken/
```

## How it was recorded

`scripts/contracts/record-share-token.mjs` runs the real Next.js handler on each case's inputs and writes its answer into `expect`. The inputs and dispositions are written by hand. `scripts/contracts/share-fixture.mjs` builds the handler's client with the **real** supabase-js 2.78 and replaces only its `fetch`, so the URL, the headers and the reading of each reply are supabase-js's own. `share-loader.mjs` hands that client to the handler in place of the cookie-session client.

A fixture gives:

- `token`: the route's `[token]`.
- `session`: the visitor's access token, or null when signed out. Next.js sends it from the session cookie, and Go reads it as a bearer. Signed out, both send the project's public key.
- `client_throws`, when the project's settings are missing.
- `database`: the Data API's reply.

`expect.database` lists each request: its path and query exactly as sent, and its `Accept`, `Authorization` and `apikey` headers.

## Recorded behaviour

- One request: `shared_conversations`, seven columns, `share_token=eq.<token>`, `deleted_at=is.null`, asking for one row as an object (`Accept: application/vnd.pgrst.object+json`). The token is encoded as URLSearchParams encodes it.
- **Public and not deleted:** 200 `{ "share": <row> }`, for anyone. The row passes through in its own field order.
- **Private, read by its owner:** row-level security returns it, and the route still answers 403 `Private link`. For anyone else the row is invisible, so it is 404.
- **No row:** an unknown token, a revoked share (`deleted_at` set), or another user's private share. PostgREST answers 406, and the route 404 `Not found`.
- **A token the database refuses** (expired, say): 404. Neither backend asks Supabase Auth first.
- **Defects** (bug register R-082): a database error, an unreachable database, an error page that is not JSON, and a success that cannot be read all answer 404 `Not found`, as if the link did not exist.
- **Defect** (R-081): without the project's settings the route answers 500 with the error's own text, from `createServerClient`. The database is not asked.
- `is_public` is checked with JavaScript's truthiness. A reply that is not an object (an empty list on a 404, say) has no `is_public`, so it is 403.
- No `Cache-Control` is set.

The live rules behind this are in `docs/database/user-db.md`: "Public can view public shared chats" (public and not deleted) and "Owners can manage their shares".

## The Go port

`backend/internal/sharetoken`, off by default; the switch is `share-token`. It passes all 17 cases, comparing the database URL character for character. Signed in, it sends the visitor's bearer to the database; signed out, the public key. It does not ask Supabase Auth first. The share page sends the bearer with `fetchWithSession`.

Where it differs, outside these cases (see `backend/README.md`, "Share (SHARE-001)"): it reads a bearer, not the session cookie. A header in any other form counts as signed out.
