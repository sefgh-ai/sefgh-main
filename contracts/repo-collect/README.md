# Repository collection contract

**Version 2** (BUG-035, 2026-10-28): `totalSaves` is everyone's saves, read from the view `repo_collection_stats` (`select=total_saves`, one row per repository; it runs with its owner's rights, R-079), after a save or removal, and on GET after the visitor's own rows (which still say whether they saved it). Before, it counted the visitor's own rows, which row-level security limits to the visitor: 0 or 1 (R-083, High). 23 cases changed; the count stand-ins answer as the view does, and `post-count-own-rows` and `get-signed-in-saved` show the view's 42 where one visitor sees 1. Each keeps the Next.js handler's answer, recorded by running it, as `next_expect` until it is retired.

**Version 1** (COLLECT-001, 2026-10-17): 49 cases, 1 marked `defect`, over three methods of `/api/repo/collect`:

- `POST` saves a repository to one of the signed-in user's collections;
- `DELETE` removes it;
- `GET` says whether the visitor saved it and how many saves it has.

The bookmark button (`src/components/repo-details/RepoCollectButton.jsx`), the repository card (`src/components/RepositoryCard.jsx`) and the starred page call `POST` and `DELETE`. Nothing in the browser calls `GET`.

```text
node --test scripts/contracts/repo-collect.test.mjs
npm run test:contracts
cd backend && go test -count=1 ./internal/collect/
```

## How it was recorded

`scripts/contracts/record-repo-collect.mjs` runs the real Next.js handlers on each case's inputs and writes their answers into `expect`. The inputs and dispositions are written by hand. A throwaway script typed the first draft; `cases.json` itself is the source now. `scripts/contracts/collect-fixture.mjs` builds the handlers' client with the **real** supabase-js 2.78 and replaces only its `fetch` and `auth.getUser()`. So every query, write and reading of a reply is supabase-js's own. `collect-loader.mjs` hands that client to the handlers.

A fixture gives:

- `method`, and `query` or `body`.
- `session`: the visitor's access token. Next.js sends it from the session cookie, and Go reads it as a bearer.
- `user`: what Supabase Auth says about that session.
- `client_throws`.
- `database`: the Data API's replies, in order.

`expect.database` lists every request: method, path and query exactly as sent, `Prefer`, `Content-Type`, `Authorization`, `apikey`, and the body, compared as JSON.

## Recorded behaviour

- **POST.** Sign-in is checked first: no session, or one Auth refuses, is 401 `Unauthorized. Please login to save repositories.`. Then the body:
  - a body that is not JSON, or `null`, is 500;
  - a body with no truthy `repoFullName` is 400.
  
  The row inserted is `{ user_id, repo_full_name, collection_name: collectionName || "default", notes: notes || null }`, as the user. The outcomes:
  - a unique-key error (`23505`) is 409;
  - any other insert error is 500 `Failed to save repository`;
  - success is 200 `{ success: true, saved: true, totalSaves }`.
- **DELETE.** Sign-in is checked first (401 `Unauthorized`), then `repo` (400). It deletes the user's row for that repository and collection (`collection`, or `"default"` when missing or empty). A failure is 500 `Failed to remove from collection`; success is 200 `{ success: true, saved: false, totalSaves }`.
- **GET.** `repo` is checked first (400), before anything else. The saves are read with the visitor's token, or the public key when signed out. A read error is 500 `Failed to fetch save status`. `saved` is whether a row's `user_id` is the signed-in user's. A refused session counts as signed out, but its token is still sent to the database, which refuses it: 500.
- **The count** after a write ignores its own error (0). It is `saves?.length || 0`, so text counts UTF-16 units, and an object's own `length` field passes through.
- **Defect** (bug register R-083): the count reads `repo_collections` as the visitor, and row-level security returns only the visitor's own rows. So `totalSaves` counts the visitor's own saves, never everyone's.
- **JavaScript's rules are kept** for unusual input: a repeated name keeps its last value; a repository name that is a number, an object or a list is inserted as sent and filtered on as `String(value)` writes it. A `null` row reached by `some()` throws: 500.
- No `Cache-Control` is set.

The 409 depends on a unique key over the user, repository and collection. That key's definition was not read from the live database: only its error code is relied on.

## The Go port

`backend/internal/collect`, off by default; the switch is `repo-collect`. It passes all 49 cases. Every read and write goes as the visitor: with their bearer when present, otherwise with the public key. Sign-in is checked with Supabase Auth for the user id that `POST` and `DELETE` write with and that `GET` compares.

Where it differs, outside these cases (see `backend/README.md`, "Collect (COLLECT-001)"):

- it reads a bearer, not the session cookie;
- a POST body over 1 MiB is answered as unreadable (500);
- methods other than GET, HEAD, POST and DELETE get Go's 405, OPTIONS included.
