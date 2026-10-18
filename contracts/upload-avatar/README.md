# Avatar upload contract

Version 1, AVATAR-001a/b (2026-10-18): **45 cases, 23 marked defect**,
recorded from `POST /api/upload-avatar` at base `4f8c815`. The Next.js handler
is unchanged; `AvatarUpload.jsx` now sends its session bearer for either backend.

```powershell
node --test scripts/contracts/upload-avatar.test.mjs
node scripts/contracts/record-upload-avatar.mjs
# Inside backend:
go test -count=1 ./internal/avatar
```

The recorder uses the installed Supabase Storage, Auth and PostgREST clients
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

Go differs outside the fixtures: a six-MiB whole-request bound; a 24-second
budget including verification and reading, with a connection read deadline,
ten seconds per upstream call, eight-MiB reply limit and refused redirects;
cleanup finishes before the response within a three-second child budget,
rather than running detached afterward. Engine error text is fixed in Go.
These differences are in ADR-0002. The existing five-MiB file limit stays.

Switch: `upload-avatar`, default off. Rollback: remove that name and rebuild
Next.js. Live Storage/RLS, concurrent replacement and deployment limits still
need verification before cutover. Tests use controlled stand-ins, not accounts.
