# Avatar upload contract

Update BUG-056 (R-094,2026-10-30): contract v3. Avatar uploads detect PNG, JPEG, GIF87a/GIF89a and WebP signatures from bytes, reject empty/unsupported/truncated signatures, and derive MIME and stored extension from the detected format. User filenames and MIME labels cannot choose the stored suffix. The 5MiB bound, caller token, existing metadata/error/cleanup policies remain; full image decoding is outside this signature check. (The Next.js rollback answers, `next_expect` and `next_engine_message`, were removed in P7-06 with the handler.)


Version 1, AVATAR-001a/b (2026-10-18), extended in REVIEW-028 (2026-10-24): **47 cases, 25 marked defect**,
recorded from `POST /api/upload-avatar` at base `4f8c815`. The Next.js handler
is unchanged; `AvatarUpload.jsx` now sends its session bearer for either backend.

```powershell
node --test scripts/contracts/upload-avatar.test.mjs
# Inside backend:
go test -count=1 ./internal/avatar
```

(Historical: the Next.js handler, this recorder and `avatar-fixture.mjs` were retired in P7-06; Go's tests run every case.) The recorder used the installed Supabase Storage, Auth and PostgREST clients
with only HTTP, the session and clock replaced. It creates real multipart
requests. Upload bytes are compared by size and SHA-256, avoiding multi-MiB
fixtures. `auth.updateUser` keeps its real HTTP/parsing implementation: only
its internal session reader is replaced. The route's detached cleanup is
drained before restoring globals. No provider is contacted.

Inputs include first/duplicate/missing/text avatar fields, all four allowed
MIME types, wrong or missing MIME, empty files, the exact five-MiB boundary,
filenames without dots or with Unicode/spaces in the extension, and malformed
multipart bodies. The fixed clock is `1792229400000` milliseconds.

The contract pins upload method/path, bearer/public key, content type,
`Cache-Control: max-age=3600`, `X-Upsert: true`, Auth PUT body (including null
PKCE fields), own-profile PATCH, Storage list defaults and deletion prefixes.
It covers upload/bucket/Auth/profile/cleanup failures and null/malformed SDK
replies. `engine_message` pins a nonempty `details` string rather than a
particular Node/V8 error message; status, top-level error and call sequence
remain exact. No response Cache-Control is set.

Preserved defects are R-041 (missing setup-file error), R-094 (MIME-only
validation, empty files and arbitrary extensions), R-095 (cleanup selection,
concurrency and ignored failures), and R-096 (partial writes without rollback).
Internal/provider errors also reach the browser (R-097); the fixtures mark those cases.
The upload or metadata returning null throws an internal error in the SDK,
whereas other malformed replies may be wrapped as an upload/profile failure.

REVIEW-028 (2026-10-24) added `filename-with-trailing-slashes` and
`filename-with-slash-run`, recorded from the unchanged Next.js handler: the
extension is everything after the last dot, slashes included, and storage-js
cleans the upload path (one leading and one trailing slash removed, then runs
collapsed) while the public URL keeps the raw name. The Go port differed there
(R-187) and now matches. Re-recording on Node 24 also rewrote the `details`
text of the two `engine_message` cases; that wording is Node's own and not
pinned, so the committed text was kept.

R-041 is decided (owner, 2026-10-23). The live `storage.buckets` has no policy,
so in production `upload-refused-bucket-missing` describes every failed upload.
Version 2 (BUG-033, 2026-10-28; 7 cases changed, each keeping the Next.js handler's answer as `next_expect`), written in Go after the cutover, drops the bucket check and answers
"Failed to upload avatar". Version 1 stays as it is until then. Evidence:
`docs/database/avatar-storage.md`.

Go differs outside the fixtures: a six-MiB whole-request bound; a 24-second
budget including verification and reading, with a connection read deadline,
ten seconds per upstream call, eight-MiB reply limit and refused redirects;
cleanup finishes before the response within a three-second child budget,
rather than running detached afterward. Engine error text is fixed in Go.
These differences are in ADR-0002. The existing five-MiB file limit stays.

Switch: `upload-avatar`, default off. Rollback: remove that name and rebuild
Next.js. Live Storage/RLS, concurrent replacement and deployment limits still
need verification before cutover. Tests use controlled stand-ins, not accounts.


BUG-057/R-096, 2026-10-30: contract v4. A failed Auth metadata or profile write returns500 and attempts to delete exactly the newly uploaded object with the caller token. Compensation has a separate three-second bound and still runs after request cancellation. Rollback refusal stays a failure and is logged without details. These separate services are not made atomic; cleanup success is not promised when Storage refuses it. Unchanged Next.js replies remain in next_expect.


BUG-058/R-097, 2026-10-30: contract v5. Avatar500 responses carry only their fixed public error field; Storage/Auth/database/library and runtime diagnostic details are omitted. Sanitized stage logging and status codes stay unchanged. Next rollback replies retain their original details. Unchanged Next.js replies remain in next_expect.


BUG-059/R-095, 2026-10-30: contract v6. Avatar replacement uses an exclusive own-folder Storage insert across participating Go instances, unique random filenames and non-overwriting uploads. Cleanup snapshots all pages before deleting in batches, traverses explicit legacy folders, and preserves the current file, lock and newer timestamps. A failed page causes no partial-snapshot deletion. Lock release is bounded. Crash/uncertain-acquisition recovery is intentionally manual (R-209); hosted acceptance and all-writers protocol are rollout gates. Unchanged Next.js replies remain in next_expect.
