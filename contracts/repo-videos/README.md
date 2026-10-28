# Repository videos contract

**Version 3** (BUG-028b, 2026-10-28): 57 cases. Uploaders come from their public profile (R-040, R-075, the owner's option A): the profile read asks for `full_name,avatar_url`, `uploader_name` is `full_name`, there is no admin lookup, and `uploader_email` is `null` for every listed video (a new video still carries the poster's own email). `get-admin-null` and `get-uploader-not-uuid` no longer fail the list (200). The stand-in profiles in `post-profile-present`, `get-profile-with-username` (`Octo Cat`) and `get-profile-without-username` (no name) now hold `full_name`. 24 cases changed; those without an earlier `next_expect` keep the Next.js handler's answer there (recorded by running it for the three profile cases).

**Version 2** (BUG-027, 2026-10-28): 57 cases. A video address must be text that parses as an `https` address with no user name or port, whose host is exactly `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `github.com` or `www.github.com` (R-088, the owner's option A); anything else is 400 `{"error":"Video URL must be an https link to YouTube or GitHub"}` before any database request. The host alone gives the type. Six version 1 cases now answer 400 (`post-direct`, `post-falsy-title`, the two lists, the number, the vertical tab); ten new cases pin the rule. Go only: the Next.js handler keeps accepting any text until it is retired, so where it answers differently a case carries `next_expect`, its recorded answer (for new cases, recorded by running the real handler through the shared runner), and `scripts/contracts/repo-videos.test.mjs` uses it.

**Version 1** (VIDEOS-001, 2026-10-17): 47 cases, 4 marked `defect`, over the three methods of `/api/repo/videos`:

- `GET` answers a repository's videos, featured first and then newest, each with its uploader;
- `POST` adds a video;
- `DELETE` removes one's own video.

The video tab (`src/components/repo-details/RepoVideoTab.jsx`) calls all three.

```text
node --test scripts/contracts/repo-videos.test.mjs
npm run test:contracts
cd backend && go test -count=1 ./internal/videos/
```

## How it was recorded

`scripts/contracts/record-repo-videos.mjs` runs the real Next.js handlers through the shared runner `scripts/contracts/route-db-fixture.mjs`, as for comments: the real supabase-js 2.78 with only `fetch`, `auth.getUser()` and `auth.getSession()` replaced. The Data API gets the visitor's token, or the public key when signed out, and the auth admin API gets the public key. GET makes its per-video requests at the same time, so its cases answer by `routes` and its requests are compared in any order. Inputs, reasons and dispositions are written by hand; only `expect` is recorded.

## Recorded behaviour

- **GET** checks `repo` first (400). It reads `select *` for the repository, ordered by `is_featured` and then `created_at`, both descending (one `order` parameter). A read error is 500 `Failed to fetch videos`. A reply that is nothing (`null`, or a success with no body) is an empty list; one that is not a list has no `map()`: 500.
- **For every video, at the same time:**
  - a video without `uploaded_by` is answered as it is;
  - otherwise the uploader's profile is read as one row;
  - when it has no `username`, an admin lookup `auth.admin.getUserById` follows.

  The reply is `{ ...video, uploader_name, uploader_email, uploader_avatar }`. `uploader_email` is `null` when the profile had a username, and otherwise the admin lookup's email, which is undefined and so left out.
- **Defects** (bug register R-075, R-040): the profile read asks for `username`, which does not exist, so it always fails, and the admin lookup goes with the public key and is always refused. Names, avatars and emails never show. Were the admin lookup ever to succeed, it would send every uploader's email to anyone (case `get-admin-answers`).
- **Throws:** a null row, an uploader id that is not a lower-case UUID (auth-js `validateUUID`), or an admin reply that is JSON `null` makes `Promise.all` reject: 500 for the whole list.
- **POST** checks, in order:
  - sign-in: 401 `Unauthorized. Please login to add videos.`;
  - the body: 500 when it is not JSON or is `null`;
  - `repoFullName` and `videoUrl`: 400 `Repository name and video URL are required`.
- **The video's type**, from `videoUrl.includes(...)`: `youtube` for `youtube.com` or `youtu.be`, else `github` for `github.com`, else `direct`. For YouTube, the id comes from the handler's pattern and gives the thumbnail `https://img.youtube.com/vi/<id>/maxresdefault.jpg`; without an id the thumbnail is `null`. The cases pin how JavaScript reads that pattern:
  - `\s` includes the no-break space and the vertical tab, so neither can be in an id;
  - `.` does not match a line separator (U+2028);
  - `{11}` counts UTF-16 units, so an emoji counts as two, and the id can end in half of one, which the thumbnail then holds.
- **A `videoUrl` that is not text:** a list is searched for an equal item (`Array.prototype.includes`), so `["x"]` is a `direct` video and is stored as a list; a list holding `"youtube.com"` throws, because a list has no `match()`: 500. A number has no `includes()`: 500. Any other text is accepted as an address (R-088).
- The row is inserted as the user, with `title || null` and `description || null`, and returned with the user's email from Supabase Auth; a user without an email has none in the reply. A failed insert is 500 `Failed to add video`.
- **DELETE** checks sign-in (401 `Unauthorized`) and `id` (400 `Video ID is required`), then deletes the row only where `uploaded_by` is the user. A failure is 500 `Failed to delete video`. **Defect** (R-087): someone else's video matches no row, which is not an error, so the answer is success.
- No `Cache-Control` is set.

## The Go port

`backend/internal/videos`, off by default; the switch is `repo-videos`. It passes all 47 cases (57 since version 2). The new pieces:

- `jscompat.JSSpace`, `jscompat.JSDot` and `jscompat.FindSubmatchUTF16`, for a JavaScript pattern in Go;
- `supabaserest.AdminUserEmail`, the admin lookup shared with comments (removed in version 3, BUG-028b).

The Go contract test also compares the halves of emoji that bodies write as escapes, because Go's JSON reader turns each into U+FFFD and would otherwise call two different bodies equal.

Where it differs, outside these cases (see `backend/README.md`, "Videos (VIDEOS-001)"):

- at most four videos have their uploader read at once, all within one 16-second budget, and a lookup cut short reads as failed;
- the first video that makes `Promise.all` reject cancels the rest;
- a POST's two database calls share a 20-second budget;
- bodies are limited to 1 MiB;
- it reads a bearer, not the session cookie.
