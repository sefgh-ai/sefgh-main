# Avatar Storage: what the upload route depends on

AVATAR-POLICY-001, started 2026-10-23 by Claude Code. Covers R-041 and the Phase 4 gate "storage authorization tests" for `POST /api/upload-avatar`.

**State: live read done 2026-10-23 (AVATAR-POLICY-001b), answers under [Results](#results). R-186 fixed in production on 2026-10-24: [The fix](#the-fix-avatar-policy-002), [Applied](#applied-2026-10-24-avatar-policy-002b).** The questions below were written before the read (AVATAR-POLICY-001a). The read that answers them is [`supabase/checks/avatar_storage_catalog.sql`](../../supabase/checks/avatar_storage_catalog.sql). It runs in a read-only transaction and returns definitions and counts, never object names, user ids or URLs.

## What the route calls

The Next.js route ([route.js](../../src/app/api/upload-avatar/route.js)) and the Go port ([handler.go](../../backend/internal/avatar/handler.go)) make the same calls, with the caller's own token and the public key. Neither uses the service role, so Storage applies row-level security to every call.

The permissions column is Supabase's own statement for each storage-js method (TSDoc in `packages/core/storage-js/src/packages/StorageFileApi.ts` and `StorageBucketApi.ts` of `supabase/supabase-js`, read 2026-10-23; the access-control guide says the same for upsert).

| Step | storage-js call | HTTP request (as Go sends it) | Needs on `storage.objects` | Needs on `storage.buckets` |
|---|---|---|---|---|
| Upload | `upload(path, buffer, { upsert: true })` | `POST /storage/v1/object/avatars/{id}/avatar-{ms}.{ext}`, `X-Upsert: true` | INSERT, SELECT and UPDATE (upsert) | none |
| After a failed upload (Next.js only; Go since R-041, BUG-033, asks nothing) | `listBuckets()` | `GET /storage/v1/bucket` | none | SELECT |
| Public link | `getPublicUrl(path)` | none: the URL is built locally | none, but the link works only if the bucket is public | none |
| Cleanup, list | `list(id)` | `POST /storage/v1/object/list/avatars`, prefix `{id}` | SELECT | none |
| Cleanup, remove | `remove(paths)` | `DELETE /storage/v1/object/avatars`, `prefixes` | DELETE and SELECT | none |

The route also updates the Auth user's metadata (`PUT /auth/v1/user`) and its own `profiles` row (`PATCH /rest/v1/profiles?id=eq.{id}`). The second depends on the `profiles` UPDATE policy, which the catalog file reads too.

## What the SEC-001 snapshot already says

From [user-db.md](user-db.md#storage), read 2026-10-15: bucket `avatars`; anyone can read; a signed-in user can upload, update and delete only under a folder named with their own id (`storage.foldername(name)[1] = auth.uid()`); every policy exists twice under two names.

That summary did not record the exact policy text, the bucket's `public` flag, its size and type limits, or any policy on `storage.buckets`. Those are what the questions below need.

## Questions the live read settles

Each names the query in the catalog file that answers it.

1. **Is the bucket public?** (query 1) The route returns a `/storage/v1/object/public/avatars/...` link without checking. If `public` is false, every avatar it saves is a broken image.
2. **Does the bucket limit size or type?** (query 1) If `file_size_limit` or `allowed_mime_types` is stricter than the route's 5 MiB and four image types, Storage refuses first and the route answers 500. If both are empty, the route's own check is the only one, and it trusts the type the browser declares (R-094).
3. **Do the object policies give exactly what the table above needs, and only in the user's own folder?** (query 3) Upsert needs INSERT, SELECT and UPDATE together; if UPDATE or SELECT is missing, a first upload works and replacing a file fails. Cleanup needs SELECT and DELETE.
4. **Can anyone list the whole bucket?** (query 3, and query 5 for the helper) The snapshot's "anyone can read" is a SELECT policy. A public bucket needs no SELECT policy for its links to work. Supabase's guide warns that a broad one lets callers list the bucket's contents, unless it is limited with `storage.allow_any_operation()`. If the live policy is `bucket_id = 'avatars'` for every role, a signed-out visitor with the public key can list every user's folder and old file names. User ids are already public in `profiles`, so the new exposure is the names of files the cleanup left behind. **Not confirmed: the exact policy text decides it.**
5. **Can a signed-in user see the bucket in `listBuckets()`?** (query 3, `storage.buckets` rows) Without a SELECT policy on `storage.buckets` for `authenticated`, the call returns an empty list, not an error. The route then gives the setup-file message (fixture `upload-refused-bucket-missing`) after every failed upload, even though the bucket exists, instead of "Failed to upload avatar" (fixture `upload-refused-bucket-exists`). That would make R-041's wrong message the normal failure message in production. **Not confirmed.**
6. **What are the duplicate policies?** (query 3) Permissive policies are combined with OR, so a duplicate does no harm today, but tightening one copy later leaves the other's access in place. Record both names of each pair.
7. **Can a user update only their own profile row?** (query 4)
8. **Does the bucket hold leftovers?** (query 7, counts only) Folders with more than one object show the cleanup failing or racing (R-095). Folders that match no current user are left from deleted accounts or written outside the route.

## Fixes and where they go

Fix once (AGENTS.md):

- **Policies and bucket settings** are database changes. They are written as a migration with a verify query and a rollback under `supabase/`, and run only with the owner's approval. They are not route code, so they do not wait for the cutover.
- **R-041's message** is backend behaviour pinned by `contracts/upload-avatar`. It is fixed in Go after this route is cut over and the Next.js handler retired, through a contract change approved by the owner.
- A confirmed "yes" to question 4 would be a privacy finding in live configuration. It gets its own register entry at once and a migration for the owner to approve, ahead of the cutover rather than after it.

## Storage authorization tests (Phase 4 gate)

These run against a project that has the `avatars` bucket and its policies, with two signed-in test users A and B, through the Go handler with the switch on:

- A uploads; the link it returns loads signed out.
- A uploads again; the second upload succeeds (upsert) and cleanup leaves one file in A's folder.
- A writes, overwrites or deletes under B's folder directly through Storage with A's token: each is refused.
- Signed out, listing the bucket returns nothing (or what the owner decides question 4 should allow).
- A refused upload gives "Failed to upload avatar", not the setup-file message.

The development project `mraglhrenqwadegvwxts` was made for the key work; whether it has an `avatars` bucket has not been checked. Where these run is the owner's choice; the live read comes first.

## Running the read

Any of these is enough; none needs a service-role key or a database password:

- The Supabase SQL editor on User-DB (`kohwfuxqbllsmvmsfqci`): paste the file, run it, and share the result tables (definitions and counts only).
- A read-only Supabase MCP connection for the agent (the steps are under "Owner decisions pending" in [coordination.md](../coordination.md)).

The file was dry-run on 2026-10-23 against PGlite 0.2.17, with the schema built from Supabase Storage's own tenant migrations (`0002`, `0008`, `0013`, `0014`, `0024`, `0058` from `supabase/storage`) plus a stand-in `auth.users` and `profiles`. All nine result sets returned, and the counts matched the objects planted for the test: 5 avatar objects (one in another bucket excluded), 3 folders, 1 at the root, 1 folder with two files, 1 folder with no user. The stand-in is a scratch file and is not committed. It shows the queries run and the column names exist; it says nothing about the live project.

## Results

Read on 2026-10-23 by Claude Code from User-DB `kohwfuxqbllsmvmsfqci` (Postgres 17.6, Storage schema migration `revoke-grants-to-unused-operations`, run 2026-10-14). The owner connected the Supabase MCP server for this; it has full access, and only SELECT statements were sent: the catalog file's queries, one at a time, with the helper bodies reduced to an MD5 and the counts combined into one row. Nothing was changed.

Two anonymous calls to the Storage API then checked the two findings as a visitor sees them. They used the public key from the app's settings and printed status codes and counts only. No object name, user id or key is recorded here.

### Bucket (query 1)

`avatars`: `public` true, `file_size_limit` 5242880 (exactly 5 MiB), `allowed_mime_types` `image/jpeg`, `image/png`, `image/gif`, `image/webp`. It is the only bucket in the project.

### Tables (query 2)

`storage.objects` and `storage.buckets`: row-level security on (not forced), owner `supabase_storage_admin`. `anon` and `authenticated` hold SELECT, INSERT, UPDATE and DELETE on both, so the policies decide everything.

### Policies (queries 3 and 4)

`storage.objects`, every one permissive and for role `public` (every role):

| Command | Names | Condition |
|---|---|---|
| SELECT | "Avatar images are publicly accessible", "Avatars are publicly accessible" | `bucket_id = 'avatars'` |
| INSERT | "Users can upload avatars", "Users can upload their own avatar" | check: `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]` |
| UPDATE | "Users can update own avatars", "Users can update their own avatar" | same as INSERT, as `using`; no `with check`, so Postgres applies the same condition to the new row |
| DELETE | "Users can delete own avatars", "Users can delete their own avatar" | same, as `using` |

`storage.buckets`: **no policies.**

`public.profiles` UPDATE: "Users can update own profile" and "Users can update their own profile", both `auth.uid() = id`, no `with check`.

### Helpers, version and counts (queries 5 to 7)

`storage.foldername`, `storage.operation`, `storage.allow_only_operation` and `storage.allow_any_operation` all exist, none with owner's rights. Objects in `avatars`: 3, in 3 folders; 0 at the root; 0 folders with more than one file; 0 folders whose name is not a current user.

### Storage API, anonymous

- `GET /storage/v1/bucket`: 200, an empty list, although the bucket exists.
- `POST /storage/v1/object/list/avatars` with an empty prefix: 200, 3 entries, all folders.

### Answers

1. **Public: yes.** The links the route returns work signed out.
2. **Limits: the same as the route's.** 5 MiB and the same four types. Storage checks the declared `Content-Type` as the route does, so R-094 (bytes are never inspected) stands.
3. **Object policies: yes, exactly what the route needs, only in the user's own folder.** INSERT, SELECT and UPDATE for upsert; SELECT and DELETE for cleanup. An UPDATE cannot move a file into another folder, because the condition also applies to the new row. Signed-out callers cannot write: `auth.uid()` is null for them.
4. **Listing: yes, anyone can list the bucket.** The SELECT condition is the bucket alone, with no operation limit, and the anonymous list returned every folder. Today that reveals which user ids have an avatar and the current file names, which `profiles` already shows. Files the cleanup misses (R-095) and folders of deleted accounts would be listable too. Registered as **R-186**.
5. **`listBuckets()` for a signed-in user: always empty.** `storage.buckets` has row-level security and no policy for any role; the anonymous call confirmed the empty answer. So in production every failed upload answers with the setup-file message (fixture `upload-refused-bucket-missing`), never "Failed to upload avatar". **R-041 confirmed.**
6. **Duplicates: four pairs on `storage.objects`, one pair on `profiles` UPDATE,** each pair with identical conditions. Harmless today; whichever fix touches these policies should leave one of each.
7. **Profile writes: own row only,** under both duplicate policies.
8. **Leftovers: none.** Each of the 3 folders holds one file, and each belongs to a current user.

### Fix options (owner's choice)

**R-041, the setup-file message.**

- **A (recommended).** In Go, after the cutover: drop the `listBuckets()` call and answer "Failed to upload avatar". That needs a contract change (version 2 of `contracts/upload-avatar`). It follows the fix-once rule and removes a call on every failure.
- **B.** Now, in the database: a SELECT policy on `storage.buckets` for `authenticated`, limited to `id = 'avatars'`. The current code in both implementations would then take the right branch with no code change. It keeps a call that diagnoses nothing useful, and the message naming a missing file stays reachable.

**R-186, listing.** Every Storage call the app makes stays inside the user's own folder, and a public bucket's links do not go through these policies. Only the upload route and its Go port touch Storage (source search, 2026-10-23). The live site still runs `sefgh-ai/sefgh-nextjs` at `c7d8828` (2026-05-24, R-066) against this database. Its upload route is identical to this repository's (compared ignoring line endings), and it has no other Storage call. So R-041 is what live users see today, and option A suits the live code too.

- **A (recommended).** One migration: replace the two public SELECT policies with one SELECT for `authenticated` in the user's own folder, and leave one copy of each duplicate. Upsert and cleanup keep working; signed-out listing returns nothing. It ships with a verify query and a rollback, for the owner to approve.
- **B.** Keep public reads but limit them with `storage.allow_any_operation(...)` to fetching single objects, as Supabase's guide shows. Listing is then refused for everyone, including the user's own cleanup, unless a separate own-folder SELECT is added; so this ends up as A plus a policy nothing uses.
- **C.** Leave it. Today it reveals nothing that is not already public.

Either migration is checked with the two-user tests above before it runs, and the anonymous probe is repeated after it.

## The fix (AVATAR-POLICY-002)

The owner chose option A for both on 2026-10-23. R-041 waits for the cutover and is fixed in Go then; nothing changes now. R-186 is fixed by:

- [`supabase/migrations/20261023120000_avatar_002_own_folder_reads.sql`](../../supabase/migrations/20261023120000_avatar_002_own_folder_reads.sql): drops both public SELECT policies, creates "Users can read their own avatars" (`for select to authenticated`, own folder, `auth.uid()` wrapped in `select` so it is evaluated once per statement), and drops the three duplicate write policies. One transaction; no `if exists`, so it stops if the live definitions have changed.
- [`supabase/checks/avatar_002_verify.sql`](../../supabase/checks/avatar_002_verify.sql): read-only, five rows that must all say `ok`.
- [`supabase/checks/avatar_002_rollback.sql`](../../supabase/checks/avatar_002_rollback.sql): restores the eight policies as read today, exposure included.
- [`scripts/contracts/avatar-storage-policy.test.mjs`](../../scripts/contracts/avatar-storage-policy.test.mjs): fails if the migration brings back a read for every role or without the folder limit, uses `if exists`, or if the rollback no longer restores exactly what the migration removed.

**Live preconditions, read 2026-10-23 (read-only):** the SQL editor and MCP run as `postgres`, which neither owns `storage.objects` nor is a superuser, but `supautils.policy_grants` lets it manage policies on that table. The Storage functions behind listing (`search`, `search_v2`, `search_by_timestamp`, `list_objects_with_delimiter`) run with the caller's rights, so the new SELECT policy governs listing. This project has no `storage.prefixes` table, so folder listings come from `storage.objects` alone.

**Dry run, 2026-10-23, PGlite 0.2.17** (scratch, not committed). The schema was built from Storage's tenant migrations as before, with the eight live policies created so that `pg_policies` showed the same text as the live read. 26 checks passed:

- Before: a signed-out caller read and listed every object, and the verify query reported a problem (R-186 reproduced).
- After: verify all `ok`; signed out, nothing to read or list; user A reads and lists only A's folder.
- A uploads, upserts and deletes in A's own folder. A cannot upload into B's folder, upsert over B's file, update or delete B's file, or move a file into B's folder. Each refusal is a row-level-security violation; the update and delete match no rows.
- Signed out, uploads are refused. A second run of the migration stops; the rollback restores the live text exactly; the migration then applies again.

Two broken variants were caught: keeping the public reads (verify: three rows not `ok`; five behaviour checks fail), and reads for signed-in users without the folder limit (one verify row, three behaviour checks). The stand-in is Postgres with Storage's schema, not the Storage server. Storage's own checks and the public-link path are confirmed only by the probe after applying.

**Applying it**, once the owner approves this file:

1. Run the migration in the Supabase SQL editor for User-DB, or have an agent run it through the MCP connection if the owner says so.
2. Run `avatar_002_verify.sql`: five rows, all `ok`.
3. Repeat the anonymous probe: listing the bucket returns no entries, and a current avatar link from `profiles` still loads.
4. Upload an avatar on the site while signed in, then run query 7 of the catalog file: still one file per folder.

If anything fails, run `avatar_002_rollback.sql` and record what happened.

### Applied 2026-10-24 (AVATAR-POLICY-002b)

The owner approved it ("yeah you can go ahead") and asked for a test on the other project first.

**Dev `mraglhrenqwadegvwxts`, against the real Storage server.** Dev was set up as a copy of production: the bucket with the same settings, and the eight policies with identical text. One fixture image was uploaded as a signed-out caller through a temporary policy limited to that one path; the policy was dropped straight after. Results, all as a signed-out caller:

| Step | Bucket list | List root / fixture folder | Public link | Upload elsewhere | Verify |
|---|---|---|---|---|---|
| Before | 0 | 1 / 1 | 200, same bytes | 400 | 4 rows not `ok` |
| Migration applied | 0 | 0 / 0 | 200, same bytes | 400 | 5/5 `ok` |
| Rollback applied | 0 | 1 / 1 | 200, same bytes | 400 | — |
| Migration applied again | 0 | 0 / 0 | 200, same bytes | 400 | — |

After the rollback, an MD5 over the policies' names, roles, commands and conditions was `3b710771…`, identical to production's before the change. So the rollback restores production exactly, and production had not changed since the read. Dev keeps the bucket, the four new policies and the fixture image, as a copy of production for later tests.

**Production User-DB.** Applied with the MCP `apply_migration` tool; history `20261024093212 avatar_002_own_folder_reads` (the file keeps its repository timestamp). Verify 5/5 `ok`; four policies, fingerprint `a000479a…`, the same as dev after the migration. Signed out: listing the bucket answered 200 with no entries (3 the day before), and all 3 uploaded avatar links that `profiles` holds still load (200, `image/png`, `image/gif`, `image/jpeg`).

**Not yet confirmed:** an upload while signed in on the real Storage server, that is upsert and cleanup under the new SELECT policy. The local dry run covers it; one real upload on the site (the live site's route is identical) closes it.
