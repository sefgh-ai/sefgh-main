# Phase 7: retiring the old logic

Started 2026-11-02 by the owner's decision ("after done start phase 7"), before the Phase 6 gate was fully met; see the ADR decisions log. Written by Claude Code (PHASE7-000). This plan is the order and the recipe; each step is one bounded task with its own handoff record in `../coordination.md`.

P7-01 implementation update (2026-11-02): both contributions handlers, its switch, contract and old tests are removed locally. See the P7-01 coordination record for checks, commit and deployment state. P7-02 retires the public GitHub Next handlers and page fallback locally (2026-11-02); Go and cases stay, with unconditional origin-required routing. See coordination for checks/commit/deployment state. P7-03 is next; no later step is included.

## What Phase 7 removes, and what stays

**Removed, route by route:** the 23 Next.js API handlers that Go serves in production (`src/app/api/**/route.js`), their now-unused helpers, the Node contract tests that run those handlers, the `next_expect*` entries that describe them, the opt-in switches (`SEFGH_GO_ROUTES`, `NEXT_PUBLIC_SEFGH_GO_DATA` and the code reading them), and the browser modules' direct Supabase fallbacks for areas Go serves.

**Stays:**

- The playground keys route `src/app/api/playground/keys`: keys were never switched to Go (their hosted acceptance is unverified).
- The worker and RepoSync code: the owner left that migration as a gap.
- The Next.js app itself: pages, React, `src/app/auth/callback/route.js`, `src/proxy.js` (session refresh).
- Supabase Auth, database, Storage and Realtime, which the migration keeps by design.
- The contract fixtures (`contracts/*/cases.json`): Go's tests keep running them. **Exception: P7-01 retires the unused endpoint itself, so its contract and Go implementation are removed too.**

## Caller audit (2026-11-02, first pass)

Browser and server code calling each old route, outside `src/app/api` (a `grep` for the quoted path; repeat it exactly in each step):

| Route | Callers | Note |
|---|---|---|
| `/api/github/contributions` | 0 | R-032: nothing calls it; decided to retire (owner, 2026-10-28) |
| `/api/github/contents/[owner]/[repo]` | 0 found | Probably built through a helper; re-check before removing |
| `/api/github/search`, `/languages`, `/trending-developers`, `/repo`, `/repo/[owner]/[repo]` | 1 to 2 each | Public reads; all reach Go through the rewrite |
| `/api/repo/collect`, `/vote`, `/rating`, `/comments`, `/comments/vote`, `/videos`, `/starred` | 1 to 3 each | Signed-in writes and reads |
| `/api/activity`, `/api/share/...`, `/api/conversations/[id]/share`, `/api/upload-avatar` | 1 to 2 each | |
| `/api/ai/chat`, `/enhance-query`, `/suggestions` | 1 each | Go has no AI keys yet (owner); chat fails until they are added |
| `/api/playground/keys` | 1 | **Stays** (not on Go) |

Every route listed except the keys route answers with `X-Sefgh-Backend: go` on `sefgh-main` (checked 2026-11-02 for a sample; check each again in its step).

## Order

| Step | Routes / scope | Why this place |
|---|---|---|
| P7-01 | `/api/github/contributions` (R-032): the Next.js handler, the Go route, its switch name, contract, tests and lesson references | Nothing calls it; decided |
| P7-02 | Public GitHub reads: search, languages, trending, trending developers, repo, repo details, contents, public-repo read (`src/lib/repo/repoData.js` fallback) | Read-only, no user data |
| P7-03 | Shares: `share/[token]`, `share/[token]/fork`, `conversations/[id]/share` | Small, verified (R-090) |
| P7-04 | The user's own reads: `activity`, `repo/starred` | Read-only, signed in |
| P7-05 | Repository interactions: collect, vote, rating, comments, comment votes, videos | Writes; one at a time |
| P7-06 | `upload-avatar` | Storage; R-095 rollout gates noted |
| P7-07 | AI routes: chat, enhance-query, suggestions | After the AI keys are on the Go project and R-038 is checked |
| P7-08 | Browser data areas: remove the direct Supabase fallback in each module behind `NEXT_PUBLIC_SEFGH_GO_DATA` (search history, onboarding, the proxy areas), and the server-side `goData` routing option | After P7-02 to P7-06, one area at a time |
| P7-09 | The switches: `goBackendRoutes` and `goDataAreas` in `next.config.mjs` become fixed rewrites to `SEFGH_GO_API_URL`; `SEFGH_GO_ROUTES` and `NEXT_PUBLIC_SEFGH_GO_DATA` are removed | Last code step |
| P7-10 | Documents: the remaining Next.js and managed-service boundaries (ADR gate), `backend-map.md`, `cutover.md`, `backend/README.md`, the briefing | Closes the phase |

## Recipe for one step

1. **Claim** the writer role in `../coordination.md`.
2. **Audit callers** for the exact paths: `grep -rn` over `src/`, `scripts/` and `backend/`. Check the production answer carries `X-Sefgh-Backend: go` (`curl -s -D - -o /dev/null https://sefgh-main.vercel.app/<path>`). If a route is not answered by Go in production, stop: it is not ready.
3. **Remove** the Next.js `route.js` and every helper now imported by nothing (check with `grep`; delete files only when nothing else uses them).
4. **P7-01 exception:** remove its rewrite/switch entirely because the Go endpoint is retired too; verify the old switch name is ignored. Other steps: **make the rewrite unconditional** for that route in `next.config.mjs`, or leave the switch until P7-09 if that is simpler. Either way, the route must still reach Go. Note that without `SEFGH_GO_API_URL` the route is then a 404: say so in `backend/README.md` (local development points it at a local Go server or `sefgh-api`).
5. **Tests:** P7-01 removes the whole endpoint contract (including `next_expect*`) and old Node/Go endpoint suites; keep retirement404/no-rewrite guards instead. For retained Go routes:
   - Delete the Node test that imported the removed handler, or reduce it to fixture-integrity checks.
   - Drop the `next_expect*` fields from that contract's cases, and note it in the contract README.
   - Make sure `go test -count=1 ./...` still runs every case.
   - Update `scripts/contracts/data-proxy.test.mjs`, `go-rewrites.test.mjs` and similar if they list the route.
6. **Lessons:** if a lesson quotes the removed JavaScript, say it is retired; never edit an `exercise.go`.
7. **Docs:**
   - the register (entries resolved by retirement, for example R-032);
   - `backend-map.md`, `cutover.md`, `backend/README.md`;
   - the ADR Phase 7 row.
8. **Checks:** `npm run lint`, `npm run build`, `npm run test:contracts`, the Go suite, then `npm run handoff`.
9. **Rollback:** `git revert` of the step's commit and a redeploy. Each step is its own commit, so one route can come back without the others.

## Not in Phase 7 now

The playground keys route (until its hosted acceptance and cutover), the analysis, search and RepoSync workers (owner's gap), and database cleanup such as `r078_backup` (owner's call).
