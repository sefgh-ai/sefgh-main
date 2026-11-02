# Cutover runbook: switching the website to the Go backend

P7-06 (2026-11-02): the Next.js handler for `/api/upload-avatar` is retired.
Go answers it alone and keeps every case of the contract; the rewrite is
unconditional when SEFGH_GO_API_URL is configured, and the old switch name is
ignored. Without a Go origin the path is 404. Go is now the only avatar upload
writer, which the R-095 lock protocol requires; its hosted acceptance gates stay
open. [Production prerequisite receipt](verification/p7-06-avatar-2026-11-02.json).
Rollback: revert the P7-06 commit and redeploy both projects.

P7-05 (2026-11-02): the Next.js handlers for `/api/repo/collect`, `/vote`,
`/rating`, `/comments`, `/comments/vote` and `/videos` are retired. The
repository page keeps its session-aware URLs; Go keeps all behaviour and every
case of the six contracts. Rewrites are unconditional when SEFGH_GO_API_URL is
configured; the six old switch names are ignored. Without a Go origin these
paths are 404. [Production prerequisite receipt](verification/p7-05-interactions-2026-11-02.json).
Rollback: revert the P7-05 commit and redeploy both projects.

P7-04 (2026-11-02): the Next.js handlers for `/api/activity` and
`/api/repo/starred` are retired. The profile card and the starred page keep
their session-aware URLs; Go keeps all behaviour, and the activity (16) and
repo-starred (14) contract cases. Rewrites are unconditional when
SEFGH_GO_API_URL is configured; the old `activity` and `repo-starred` switch
names are ignored. Without a Go origin these paths are 404. The activity
reference model that Go's 400-input test compares with now stands alone
(it was checked identical to the handler-based answers before removal).
[Production prerequisite receipt](verification/p7-04-user-reads-2026-11-02.json).
Rollback: revert the P7-04 commit and redeploy both projects.

P7-03 (2026-11-02): the Next.js handlers for `/api/share/[token]`,
`/api/share/[token]/fork` and `/api/conversations/[id]/share` are retired.
The shared page and ShareDialog keep their session-aware URLs; Go keeps
all behavior/authorization and92contract cases. Rewrites are unconditional
when SEFGH_GO_API_URL is configured; old share-token/share-fork/conversation-share
switch names are ignored. Without a Go origin these API paths are404.
Local development needs a local Go server or https://sefgh-api.vercel.app.
The unused browser shares module and legacy Next share recorders/fixture
runner are removed; shared session/server helpers remain in use.
[Production prerequisite receipt](verification/p7-03-shares-2026-11-02.json)
uses a missing-share GET and wrong-method GETs only, with Go markers.
No live share writes, deployment or signed-in browser acceptance were done.
Rollback: revert the P7-03 commit and redeploy both projects. Earlier Next
share handler/switch/recorder descriptions below are historical.


P7-02 (2026-11-02): seven public GitHub Next.js handlers are retired:
search, languages, trending, trending developers, repository summary/details
and contents. Their URLs still reach the retained Go implementations through
unconditional rewrites whenever `SEFGH_GO_API_URL` is configured. Without that
origin these URLs are404; local development must point it at a local Go
server or `https://sefgh-api.vercel.app`. The repository page and metadata
also require the Go origin and no longer fall back to GitHub. Their old
`github-public-repo` switch is ignored. The direct GitHub helper stays only
for the Next starred handler until P7-04; shared issuer/public-token/identifier
helpers remain where still used. All408Go contract cases remain; Next-only
fields/runners and orphan language catalog/trending measure code are removed.
[Production routing prerequisite](verification/p7-02-public-reads-2026-11-02.json):
all seven website paths answered from Go; server-only public-repo was checked
on sefgh-api. This is not deployment or browser acceptance. Rollback: revert
the P7-02 commit and redeploy both projects. Earlier public-route switch,
rollback-handler and duplicated-implementation notes below are historical.


P7-01 (2026-11-02) retires `/api/github/contributions` from both projects,
its switch and contract. No app calls it. The pre-removal website GET was400
with `X-Sefgh-Backend: go`; see [receipt](verification/p7-01-contributions-2026-11-02.json).
Local checks do not establish live retirement. After deployment it is404
regardless of the Go origin or stale route setting. Rollback is
`git revert <P7-01-commit>` followed by redeploying both projects. The
switch-only rollback described below still applies to routes not yet retired.
Phase7 started by the owner before the Phase6 gate (ADR, 2026-11-02); follow
[the retirement plan](plans/phase7-retirement.md). P7-02 is next; do not start
P7-07 until the owner confirms AI keys on `sefgh-api` and R-038 is checked.

Written by Claude Code on 2026-10-19 for the owner. Everything below is **off** until you switch it, and each switch is undone by removing a name and redeploying. Nothing here has been switched on except `github-trending` (since 2026-10-15). How the Go project itself is hosted is in `hosting-setup.md`; this runbook starts where that guide's Part C ends.

## The two switches

| Setting (on the **website** project) | What it switches | Example |
|---|---|---|
| `SEFGH_GO_API_URL` | Where the Go server is. Without it nothing goes to Go, whatever else is set | `https://sefgh-api.vercel.app` |
| `SEFGH_GO_ROUTES` | API routes the website forwards to Go (a rewrite in `next.config.mjs`). One name, `github-public-repo`, has no rewrite: the repository page's server render asks Go itself (REPO-PAGE-001) | `github-languages,github-search` |
| `NEXT_PUBLIC_SEFGH_GO_DATA` | Areas of the browser's own database calls sent through Go. It is built into the browser code, so it needs a new build, not just a restart | `search-history,notifications` |

**Rolling back** is always the same: remove the name, redeploy. A route then goes back to its Next.js handler. A data area goes back to calling Supabase directly. If a data area's rewrite is missing (for example `SEFGH_GO_API_URL` is not set), the browser gets a 404 that Go did not send and calls Supabase directly by itself. If the Go server is down, the switched routes and areas fail until you roll back.

**Always on a preview first.** Set the names for **Preview** only, deploy a preview, check it, then set the same names for **Production**. Switch one or a few related names at a time, so a problem has one cause.

**Keep Production's own values while a preview is tested.** Give Preview its own entries of `SEFGH_GO_API_URL` and `SEFGH_GO_ROUTES`; do not untick Production on the existing ones. Production must keep `SEFGH_GO_API_URL` and every name already live (today `github-trending`). On 2026-10-27 the production website was found no longer forwarding trending, so `/trending` was empty again (R-202). After any change to these settings and a production redeploy, run `node scripts/compare-deployments.mjs https://sefgh-main.vercel.app https://sefgh-api.vercel.app --switched=` with the names that should be live; it fails on any route that is not forwarded as expected.

## Settings the Go project needs

These go on the Go project (`sefgh-api`), not the website. All are public values except the tokens; no service-role key or database password is ever needed.

| Setting | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Every route or area that signs a user in or reads the database (everything except the public GitHub reads) |
| `NEXT_PUBLIC_SITE_URL` | `conversation-share`: the start of share links. Without it the links can start with the wrong address |
| `GITHUB_PUBLIC_READ_TOKEN` (no scopes) | Optional: GitHub reads for signed-out visitors, including `trending-topics`, under a higher rate limit |
| `GITHUB_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | Only the three AI routes |

## Recommended order

From least risk to most. Within a step, the names can go together.

1. **Public GitHub reads:** `github-languages`, `github-search`, `github-trending-developers`, `github-repo`, `github-repo-details`, `github-contents`, `github-public-repo` (`github-trending` is already on). `github-public-repo` is the repository page's own read, made on the server: open a repository page and check that the Go project's logs on Vercel show `/api/github/public-repo/...`; a private or missing repository still shows the not-found page. No user data. **Check:** the search page, a repository's page and its files, the trending page; the browser's Network tab shows `x-sefgh-backend: go` on those requests. `scripts/compare-deployments.mjs` checks the same from outside, before and after the switch. Before: passed 14 of 14 on 2026-10-24 ([verification](verification/cutover-step1.md)). After: run it with `--switched=` and the step's names. (2026-10-24: the token is set on both projects and verified; the owner switched this step for Preview.) **First set `GITHUB_PUBLIC_READ_TOKEN` on the Go project:** on 2026-10-24 about 70 test requests over an hour and a half used up its signed-out GitHub allowance, and the already-switched trending route answered 500 until it reset ([details](verification/cutover-step1.md#githubs-allowance-ran-out-during-these-checks)).
   Progress: step 1 is on **Production** since 2026-10-28 (owner; R-202 fixed). Checked from outside at 12:37 UTC with `compare-deployments.mjs` and the step 1 names, 14/14 identical. `github-public-repo` is not yet confirmed in the Go project's logs. Step 2 (`share-token`, `trending-topics`) is on Production since 2026-10-28 too: through the website both answer with `X-Sefgh-Backend: go` (a missing share 404 as before; topics 200), checked at 13:03 UTC. Step 3 (`activity`, `repo-starred`) is on Production since 2026-10-28: through the website both answer a signed-out caller 401 with `X-Sefgh-Backend: go`, checked at 13:47 UTC; the signed-in check (the profile's activity grid, the starred page) is the owner's. Next is step 4. On the same day the owner switched **everything else at once** on Production: every route name in `SEFGH_GO_ROUTES` and every area in `NEXT_PUBLIC_SEFGH_GO_DATA`. At 14:09 UTC every probed route and area answered with `X-Sefgh-Backend: go`. The Go project lacks `GITHUB_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_SITE_URL` (the owner could not copy the secret values): suggestions answer `predefined-fallback` with none, the enhance button `basic-enhancement`, chat is expected to fail, and share links may start with the wrong address until the site URL is set.
2. **Public reads of shared data:** `share-token` (open a public share link and a private one), `trending-topics` (the trending page's topic sections appear; check the reply's `cache-control` and that a reload a minute later is fast, which means the CDN cache is working). On the Go service itself, the topics answer and a CDN hit were confirmed on 2026-10-24. `share-token` needs the two Supabase settings on the Go project first; they were not set on that date ([verification](verification/cutover-step1.md#step-2-checked-on-the-go-service)).
3. **The user's own reads:** `activity` (the profile's activity grid), `repo-starred` (the starred page). **Check** signed in and signed out.
4. **Repository interactions:** `repo-collect`, `repo-vote`, `repo-rating`, `comment-vote`, `repo-comments`, `repo-videos`. **Check** on a repository page: save and unsave, vote, rate, comment, edit and delete a comment, add and delete a video, each signed in and signed out.
5. **Conversations shared and forked:** `conversation-share`, `share-fork`, after `NEXT_PUBLIC_SITE_URL` is set on the Go project. **Check:** create a share link, open it signed out, fork it signed in, delete the link.
6. **Avatar:** `upload-avatar`. **Check:** upload a PNG and a JPEG on the profile page; the new picture shows after a reload.
7. **The browser's database calls**, one area at a time in `NEXT_PUBLIC_SEFGH_GO_DATA`. Each needs a new build:
   - `search-history`: search signed in, open the history list, delete one, clear all.
   - `onboarding`: a new account's onboarding, every step to the end.
   - `notifications`: open the bell, mark one and all as read, delete one. A new account's welcome notification is written through Go too, by the sign-in callback on the server (DATA-010).
   - `profile`: edit the bio and website.
   - `user-stats`, `search-stats`: the profile's stats and the search page's figures show.
   - `home`, `submissions`: the home page's projects and categories; submit a project and delete the submission.
   - `repo-page`: a repository page's counts and comments. Switch `profile` with it, or the comment authors' names still come straight from Supabase. These reads are made on the server (DATA-010), so the browser's Network tab does not show them: while a repository page loads, the Go project's logs on Vercel should show `/api/data/repo-page/` and `/api/data/profile/` requests.
   - `activity`: do something that is logged, then check the activity grid.
   - `conversations` last, as it is used most: start a chat, send messages, rename, pin, archive and delete a conversation, and check the list updates by itself (Realtime).
8. **AI routes last:** `ai-suggestions`, `ai-enhance-query`, `ai-chat`, with the AI keys on the Go project. Their per-user limits are counted in memory, by each copy of the Go server separately: on Vercel several copies may run, so the limits are looser than they read. Decide whether that is acceptable before switching them on.

## What behaves differently through Go

Each of these is recorded in `adr/0002-go-backend.md` ("Recorded differences") or the route's contract README. The main ones a visitor could notice:

- Requests are sent with the user's bearer token instead of the session cookie; the browser code already sends it.
- Writes have time limits (about 20 to 25 seconds) where Next.js had none.
- Search history: a signed-out delete answers `false`; the counter of searches still does not increase (R-102, fixed in Go after cutover).
- Onboarding refuses fields its steps never write, `user_id` included. The data proxy refuses fields the website never writes, and any update of the stats (R-103). Changes the proxy allows, such as `user_id` on a notification, are still decided by row-level security, as before.
- Share links start with `NEXT_PUBLIC_SITE_URL`.

## Not ready to switch

- **`playground/keys`** has no Go route: it waits for KEYS-001, which needs the key tables' definitions (run `supabase/checks/keys_001_catalog.sql` in the SQL editor, or authorize the Supabase connector).
- **The trending refresh** is not ported on purpose. It is replaced by `trending-topics` and is removed in Phase 7.

## After a switch has run for a while

- **Phase 6:** bugs recorded as "fixed in Go after cutover" are fixed then, once each, in the Go code: among them R-084, R-087, R-089, R-090, R-094 to R-097, R-102, R-040 and R-075 (`bug-register.md`).
- **Phase 7:** started by the owner on2026-11-02 before Phase6's gate was fully met; once a route or area has run on Go long enough to trust, its Next.js handler or direct Supabase path, the dead code listed in the register, and the switch for it are removed.
