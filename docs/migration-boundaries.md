# Current migration boundaries

P7-10a, 2026-11-03. Source audited at base `c236f71` on `main`, after P7-09a.
This is the current checkout boundary inventory for ADR-0002. It prepares the
P7-10 documentation gate; **Phase 7 remains open** while P7-07 and the AI part
of P7-09 are gated. See [coordination](coordination.md) for ownership, commits,
checks and deployment evidence, and the [retirement plan](plans/phase7-retirement.md)
for the next bounded task. Earlier dated implementation descriptions in other
documents are historical where they differ from this inventory.

## What runs where

| Boundary | Current responsibility | Source / limit |
|---|---|---|
| Next.js and React | Pages, rendering, browser UI, same-origin forwarding, security headers and session handling | [routing configuration](../next.config.mjs), [session proxy](../src/proxy.js), [auth callback](../src/app/auth/callback/route.js). The Next.js app is retained. |
| Go API | Retained public GitHub reads, repository page enrichment, activity/starred, repository interactions, shares, avatar upload, topics, search history, onboarding and nine policy-proxy areas | [API mux](../backend/cmd/api/main.go), [data policy](../backend/internal/dataproxy/policy.json). No Next handler remains for these retired API paths. |
| AI routes | Go implementations plus three Next.js handlers retained pending P7-07 | [chat](../src/app/api/ai/chat/route.js), [enhance-query](../src/app/api/ai/enhance-query/route.js), [suggestions](../src/app/api/ai/suggestions/route.js). Three exact route-name opt-ins still select Go. |
| Legacy playground | Legacy key creation in Next.js; browser key/limit/log operations still reach Supabase directly | [keys handler](../src/app/api/playground/keys/route.js), [legacy UI](../src/components/playground/ApiKeysTab.jsx). This is the remaining business-data exception, outside current retirement. |
| Keys v1 | New hashed-key API and UI are implemented with independent activation gates | [Go runtime](../backend/cmd/api/keys.go), [v1 UI](../src/components/playground/V1Playground.jsx), [acceptance gates](database/keys-hosted-acceptance.md). Local tests do not establish hosted acceptance. |
| Supabase managed services | Auth, Postgres/Data API/RPCs, Storage and Realtime remain | [ADR](adr/0002-go-backend.md). Go migration moves custom application logic; it does not replace these services. |
| Workers / ingestion / corpus | Offline Go parity tooling and a gated RepoSync command exist; live pipeline replacement is unfinished | [worker plan](plans/analysis-search-workers.md), [RepoSync readiness](plans/reposync-discover-readiness.md), [consolidation plan](plans/database-consolidation.md). No worker activation or data transfer is implied by route retirement. |

Exactly four files remain under `src/app/api/**/route.js`: the three AI handlers
and legacy keys. `/auth/callback/route.js` is outside that API count. Contributions
was retired in both runtimes under R-032; the old trending-refresh route was also
retired. The retained Go contracts still run after their Next-only runners and
rollback expectations are removed. Contributions is the whole-endpoint exception.

## Routing and failure behavior

All rewrites below require `SEFGH_GO_API_URL`. It is a server-side website setting
read by [next.config.mjs](../next.config.mjs), and changing it requires rebuilding
and deploying the website. Use the local Go server or an approved hosted Go origin
for local development; do not assume a deleted handler is available as a fallback.

| Route group | Additional selection | Without the required selection/origin |
|---|---|---|
| Public GitHub reads; shares; activity/starred; repository interactions; avatar; topics; search history; onboarding; nine `/api/data/{area}` paths | None | No Go rewrite; retired website API paths return 404. |
| Server repository-page enrichment | Direct Go request using the same origin | No origin or unusable Go response follows the page's not-found behavior; no direct GitHub fallback. |
| Server data-proxy requests | Listed table/RPC in the shared area map | Missing origin returns Data API-shaped 503 (`SEFGH503`); it does not retry Supabase directly. |
| `/api/ai/suggestions`, `/api/ai/enhance-query`, `/api/ai/chat` | Respectively `ai-suggestions`, `ai-enhance-query`, `ai-chat` in `SEFGH_GO_ROUTES` | Retained Next.js handler answers when its rewrite is absent. |
| `/api/v1/keys`, `/api/v1/keys/:selector`, `/api/v1/search` | Exact website flag `NEXT_PUBLIC_SEFGH_KEYS_V1=1` | No v1 rewrite. These paths have no Next handler. |
| `/api/playground/keys` | Legacy UI flow | Next.js handler remains; no Go rewrite replaces it. |

Only those three AI names are read from `SEFGH_GO_ROUTES`. Old public/read/write,
`trending-topics` and `playground-keys-v1` names are ignored. The variable must stay
until P7-07 and the remaining P7-09 work are complete. `NEXT_PUBLIC_SEFGH_GO_DATA`
and the server `goData` option are no longer read.

V1 forwarding alone does not enable Go's keys runtime. Go independently requires
exact `SEFGH_KEYS_V1=1`, accountant credentials and successful approved-policy /
capability validation. Disabled runtime returns 404 with `Cache-Control: no-store`;
failed required runtime configuration or policy returns 503/no-store. Keep signing
stopped and use the [keys plan](plans/playground-keys.md) for its separate gates.

## Database, sessions and managed services

The browser and server still use supabase-js. Calls for the nine areas in
[go-areas.mjs](../src/lib/go-areas.mjs) are intercepted by
[data-routing.js](../src/lib/supabase/data-routing.js), including SDK calls that
still look like `.from(...)` or `.rpc(...)` in React. Those areas are notifications,
profile, user-stats, home, submissions, search-stats, conversations, repo-page and
activity. Search history and onboarding have dedicated Go endpoints. For those
eleven areas there is no direct database fallback. The nine proxy areas enforce
the shared proxy policy; search history and onboarding enforce their dedicated
handler rules. Database requests retain the caller's token at the managed Data API.

Unlisted Data API targets still pass through to Supabase. In particular, the legacy
playground uses `api_keys`, `api_limits` and `api_logs` directly (ApiKeysTab, LimitsTab,
MonitoringTab, UsageTab and TestingTab). The legacy Next keys handler also accesses
`api_keys`. These are explicit residual custom business-data paths.

Auth remains with Supabase and the Next session machinery. The browser obtains the
session bearer for protected Go requests; Go verifies it through Supabase Auth's
user endpoint ([auth package](../backend/internal/githubaccess/access.go)). Go does not hand-parse SSR
cookies. Server SDK calls retain the cookie-backed session. The auth callback's
welcome-notification insert is sent through the same server data routing.

Storage remains managed by Supabase; the avatar writer is Go, with R-095 hosted
acceptance still required. Realtime subscriptions remain direct SDK channels
(e.g. [notifications](../src/contexts/NotificationContext.js),
[projects](../src/hooks/home/useProjects.js), [user stats](../src/hooks/useUserStats.js)).
Neither a `.from(...)` call nor a source policy file proves deployed RLS, RPC bodies,
triggers, grants or all-writer behavior. Keep the existing catalog and acceptance gates.

## Residual work and rollback

| Item | What is still required |
|---|---|
| P7-07 / R-038 / R-213 | Verify the website-to-Go address/allowance boundary and diagnose the AI helper fallbacks using provider/log evidence; fulfill the owner's AI gate before retiring any AI handler. A key being present does not by itself clear these entries. |
| P7-09 remainder | After P7-07, remove the three AI opt-ins and `SEFGH_GO_ROUTES` reading with routing regressions. P7-09a completed only the non-AI part. |
| P7-10 closure | Refresh this inventory after remaining code steps; record their review/checks and deployment/rollback evidence. This inventory alone cannot close the phase or waive the Phase6 exception's remaining gates. |
| Legacy keys | Hosted provisioning, accounting/policy and acceptance/cutover gates remain separate. Preserve legacy UI/handler until its approved replacement is ready; no signing/provisioning here. |
| Avatar / R-095 | Hosted lock, insert and all-writer acceptance remain open. R-209 automatic crash-lock recovery is owner-deferred; accepted manual recovery remains. |
| Workers and consolidation | Preserve the owner-defined gap; no worker execution, corpus transfer, source teardown or broadened credentials without the respective plan's gates. |
| Public-repo helper residue | `fetchRepoFromGitHub` remains exported in repoData.js and is exercised by Node tests; current `src/` caller search finds no application use. Its stale starred comment is historical. No helper removal is included in this documentation task. |

For a retired handler, remove neither the Go origin nor a route name as a rollback:
that cannot reconstruct deleted source. Revert that bounded retirement commit,
restore any earlier required routing setting and redeploy the affected website/Go
projects as described in its handoff. A v1 UI flag change is a separate activation
control, not a retirement rollback. Avoid dual writes and preserve database state.

## Evidence and checks

This inventory is source-derived. It does not establish current hosted environment
values or repeat live acceptance. [P7-09a's dated receipt](verification/p7-09a-routing-2026-11-03.json)
observed website topics answered by Go and v1 website paths returned 404 without a
Go marker; direct Go v1 returned 404/no-store. Those observations do not prove the
internal settings, and later deployments may change the live state.

For documentation-only edits, check changed local links, source pointers, the
remaining-handler/routing inventory and `git diff --check`. Normal
`npm run handoff` still checks contracts and uncached Go test/vet/gofmt; lessons
are skipped under owner policy. App lint/build are required when application
source changes; they are not required for this documentation-only task.
