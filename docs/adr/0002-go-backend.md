# ADR-0002: Staged migration of the SEFGH application backend to Go

Status: **Accepted** by the project owner on 2026-10-11. Supersedes [ADR-0001](0001-rust-backend.md), which proposed Rust and was never accepted. Reviewers: Codex and Claude Code.

This document stands alone. Nothing in ADR-0001 needs to be read to follow it.

## Context

The owner wants the custom backend moved out of Next.js. The current app mixes 25 Next.js API route files, direct browser Supabase access, Next.js session handling, database RPCs, and separately checked-out Python ingestion and analysis services. See `../backend-map.md` for the source evidence and its limits.

ADR-0001 proposed Rust. Before any Rust was written, the owner asked whether Go would be better and chose Go. The reasons recorded at the time:

- Many handlers wait on GitHub, an AI provider, or Supabase. Upstream waits may dominate their latency; equivalent Go and Rust response times have not been measured.
- Go was chosen for readability and maintainability, and its standard library covers the current HTTP, JSON and concurrency needs without third-party packages. Build-time comparisons have not been measured.
- Rust offers compile-time guarantees. The existing contract fixtures check the covered `null` versus missing-key cases across implementations; they do not replace all of those guarantees.

No performance, cost or traffic measurement exists for either language. Nothing in this decision claims that Go makes search or chat faster.

## Decision

Build one modular Go API in `backend/`, with separate worker commands when background ingestion and analysis are ported. Keep the Next.js UI and managed Supabase Auth, Postgres, Storage and Realtime. Move routes one at a time behind an opt-in switch, so each can be rolled back alone.

The eventual goal is that custom backend logic lives in Go. Replacing Supabase's managed identity, database, storage or realtime service is a separate decision this ADR does not make. Browser business-data operations move behind Go domain by domain; direct Auth and Realtime SDK use in the browser may stay, but must be stated. The Python services stay until the active pipeline and parity criteria are known, then are ported as separate slices.

### Components

In use now:

- Standard library only: `net/http` for the server, routing and upstream calls; `encoding/json`; `log/slog`; `testing` and `net/http/httptest`.
- `backend/internal/jscompat`: query-string parsing and percent-encoding that match JavaScript. Go's `net/url` differs from the browser rules the contracts were recorded from, so handlers must not use `r.URL.Query()` or `url.QueryEscape` where a contract pins the result.
- One package per route or domain under `backend/internal/`. One server command, `backend/cmd/api`.

Candidates, not yet adopted. Check current documentation and pin a tested version when one is first needed:

- A JWT library with JWKS support for verifying Supabase access tokens.
- `pgx` for direct Postgres access, only after database roles, policies and transaction-local claims are designed and tested. A direct connection neither provides nor bypasses RLS by itself: the connection role and claims decide.
- A router library, only if the standard `ServeMux` stops being enough.

Add a third-party dependency only when the standard library cannot reasonably do the job, and record why here.

### Authentication and authorization

Keep `src/proxy.js` and `/auth/callback`. For protected Go endpoints, accept an access token obtained through the existing session flow, or forwarded by a thin session-aware Next.js adapter. Go must verify signature, issuer, audience, expiry and algorithm. Never trust a client-supplied user ID or unsigned claims. Do not hand-parse Supabase SSR cookies in Go.

AUTH-001 delegates verification to the configured Supabase project's Auth `/auth/v1/user` endpoint, which verifies its own tokens regardless of signing-key mode. The public anon key is sufficient; Go never decodes unverified claims. A future local JWT verifier must first confirm signing-key mode, issuer, audience, algorithms, expiry and rotation behavior. See [Supabase signing keys](https://supabase.com/docs/guides/auth/signing-keys).

Do not use a service-role credential for ordinary user operations. It bypasses RLS and changes the security model. Call the Supabase Data API and RPCs with the verified user's token, so the existing RLS identity still applies. Give workers their own narrowly scoped privileges. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Keep same-origin routing through Next.js, and test cookies, CSRF protection for cookie-authenticated mutations, streaming and headers. Public GitHub reads need no session. Private reads require the verified Supabase/GitHub bearer pair in [the access contract](../../contracts/github-access/README.md), including at the direct Go URL. Private UI integration is a subsequent slice: browser storage and sharing need isolation before private results enter those flows.

### How a route moves

1. Record the route's behaviour as fixtures under `contracts/`, passing against the Next.js handler.
2. Mark anything probably wrong as `defect`. The owner decides which defects to fix. A fix changes the fixture and **every** implementation in the same commit and raises `contract_version`.
3. Write the Go package and a contract test that runs the same fixtures.
4. Register the route in `backend/cmd/api/main.go` and name it in `goBackendRoutes` in `next.config.mjs`. It stays off until `SEFGH_GO_API_URL` and `SEFGH_GO_ROUTES` enable it at build time.
5. Add or extend a lesson in `learn-go/` for the Go the route introduces. The owner is learning Go from this codebase.
6. The other agent reviews. Cut over only when the gate for that phase is met. Roll back by removing the route's name and rebuilding.

Never dual-write to compare stateful implementations. Compare read fixtures or safe shadow reads.

## Options considered

| Option | Benefit | Main cost or risk | Outcome |
|---|---|---|---|
| Improve the existing Next.js backend | Fastest way to fix auth controls, caching, concurrency and tests | Business logic stays spread across handlers and browser code | Still valid for individual fixes, and used for the search defects |
| Staged Go API and workers | Simple language, fast builds, small dependency surface, good fit for I/O-bound work and for workers | Two runtimes during the migration | **Chosen** |
| Staged Rust API and workers | Strong compile-time guarantees; potential resource benefits remain unmeasured here | Additional learning and implementation work; build-time, memory and bottleneck comparisons are unverified | Not chosen |
| Rewrite everything at once, including managed services | Maximum ownership | Auth, data, realtime and embedding regressions; slow rollback; unproven payoff | Rejected |

## Phases and gates

| Phase | Bounded work | Evidence required before cutover | State on 2026-10-11 |
|---|---|---|---|
| 0: contracts | Inventory callers; obtain schema, RLS, RPC, trigger and storage definitions for affected domains; record fixtures and baseline; identify the active Python services | Versioned evidence, reproducible behaviour, discrepancies recorded | Search contract at version 2. Lint and build baseline recorded. Database definitions and Python lineage not obtained |
| 1: first read paths | `/api/github/search`, then the two repository detail routes and contents | Fixture parity old and new; invalid-input and upstream-failure tests; explicit timeout and cache behaviour; staging latency and resource comparison; tested rollback | Search, both repository detail routes and contents implemented in Go and passing all fixtures; switch and rollback tested locally. No staging comparison; none cut over |
| 2: remaining GitHub and AI | Contributions, languages, trending reads; then the AI proxy with verified token or guest policy, quotas, cancellation, and separately versioned streaming | Public-versus-authenticated policy settled; quota enforcement; old JSON compatibility; streaming consumer tests if introduced | Every route implemented in Go (contributions, languages, trending, trending developers, and the three AI routes), each off by default except trending, switched on in production on 2026-10-15 (SEC-001b). None cut over |
| 3: user data | Browser conversation, history, profile, notification and other domain operations behind Go; repo interaction, sharing and playground routes | Two-user isolation tests; RLS and ownership equivalence; revoked and private share behaviour; atomic conversation writes; realtime parity; hashed key lifecycle and server-side accounting | ACT-001 (2026-10-14) recorded the first Phase 3 contract, `GET /api/activity`, against Next.js. ACT-002 (2026-10-14) ported it to Go, off by default, asking the Data API with the caller's own token. STAR-001 (2026-10-15) recorded and ported `GET /api/repo/starred` the same way and moved the shared Data API code into `internal/supabaserest`. Neither is turned on. SEC-001 (2026-10-15) read the database definitions; both tables let a user read only their own rows, so what remains for those two is review. SHARE-001 (2026-10-16) recorded and ported `GET /api/share/[token]`, the last read-only route, off by default: the visitor's bearer or the public key, no Auth call. COLLECT-001 (2026-10-17) recorded and ported `/api/repo/collect` (GET, POST, DELETE), the first route that writes, off by default: every write goes as the caller with their own token. VOTE-001, RATING-001, CVOTE-001, COMMENTS-001 and VIDEOS-001 (2026-10-17) did the same for `/api/repo/vote`, `/api/repo/rating`, `/api/repo/comments/vote`, `/api/repo/comments` and `/api/repo/videos`, and SHARE-002 (2026-10-17) for `/api/conversations/[id]/share` and `/api/share/[token]/fork`. The browser's own database calls: planned area by area (`../plans/browser-data.md`); search history (DATA-001b) and onboarding (DATA-002) are served by their own Go endpoints and the other nine areas through the Go data proxy (DATA-PROXY-001, 2026-10-19), all behind the per-area setting, off by default; only the playground (KEYS-001) has no Go path. Hosting exists since 2026-10-15. DATA-010 (2026-10-27) extends the area switches to the server-rendered repository page and the sign-in welcome notification (R-204), and REPO-PAGE-001 (2026-10-27) serves the page's public GitHub read from Go (`github-public-repo`, `internal/publicrepo`), both off by default |
| 4: jobs and storage | Trending refresh with staging and atomic promotion, avatar workflow, RepoSync ingestion | Idempotency, retries, checkpoints, partial-failure recovery, separate worker privileges, storage authorization tests | Avatar contract and default-off Go port implemented (AVATAR-001a/b, 2026-10-18). Storage authorization evidence: call-to-permission map, planned two-user tests and a read-only catalog file in `../database/avatar-storage.md` (AVATAR-POLICY-001, 2026-10-23). The live read (001b, same day) confirmed the object policies the route needs, confirmed R-041 in production and found R-186 (anyone can list the bucket). The owner chose option A for both: R-041 in Go after cutover; the R-186 migration (AVATAR-POLICY-002) was applied to production on 2026-10-24 after a dev test against the real Storage server (signed-out checks only). Signed-in two-user tests against a real Storage server have not run. Trending refresh: the owner chose to drop the stored table (R-077, option A, 2026-10-19); the Go endpoint `GET /api/trending/topics` is implemented off by default (TREND-001a), so no refresh job or worker privilege is needed. RepoSync: contract recorded from the Python worker against local fakes (13 cases, 7 defect) and ported to a gated worker `cmd/reposync` (REPOSYNC-001, 2026-10-24); not run against GitHub or a database, execution gated (2026-10-20) |
| 5: analysis and search workers | The chosen RepoAnalyser pipeline and semantic-search orchestration | Model, dimension, vector-column and RPC agreement; fixed-corpus retrieval evaluation; result mapping; ingestion throughput and recovery parity | PHASE5-001 (2026-10-20): source lineage snapshot and offline Go parity checker implemented; synthetic checks only. [Worker plan](../plans/analysis-search-workers.md). Active pipeline/corpus/schema not verified; no worker or search API replacement/cutover |
| 6: bugs and broken UI/UX | Record every known bug and broken UI/UX path in `../bug-register.md`, including a walk-through of every page; fix every entry | Every register entry fixed with a check that would catch it again, or deferred by the owner by name; `npm run lint` passes; the walk-through repeated after the fixes finds nothing new at High or Medium | Added 2026-10-14 by the owner. Register opened with 47 entries (BUG-001); 91 entries by SHARE-002 (2026-10-17), 28 fixed. On 2026-10-27: 204 entries, 109 fixed, 91 open (17 High, 34 Medium, 40 Low), most waiting on an owner decision, a contract approval, a cutover or the worker gate. `npm run lint` passes with no warnings (`--max-warnings 0`, BUG-010) and runs in CI. Signed-out walk-through of 44 pages done (BUG-010); the signed-in walk-through waits for the test accounts |
| 7: retire old logic | Remove replaced handlers, direct browser business-data calls and temporary adapters | Phase 6 gate met; caller audit; no dual writes; rollback observation period complete; remaining Next.js and managed-service boundaries documented | Not started |

A read-only Phase 1 route does not wait for unrelated schema work. No database mutation moves before its own schema and policy gate passes.

### Phase 6: bugs and broken UI/UX (added 2026-10-14)

The owner added this phase on 2026-10-14: every bug and every broken piece of UI or UX is to be recorded and fixed before the cleanup phase. Retiring old logic deletes the Next.js handlers the contracts compare against and touches many files at once, so the behaviour it must preserve should already be the corrected behaviour, and each fix should still have both implementations to test against.

When it runs:

- **Recording starts now and never stops.** Any agent that finds a bug or a broken UI/UX path adds it to `../bug-register.md` in the same change, even if it does not fix it. The register says how entries are numbered, rated and marked.
- **Fixes can land at any time**, in bounded tasks named `BUG-0NN`, alongside the other phases. Phase 7 does not start until this phase's gate is met.
- **The walk-through** (task BUG-002) opens every page in `src/app` signed out and signed in, at phone width (375 px) and desktop width, and records broken links and controls, console errors, failed requests, layout that breaks, and states with no feedback (loading, empty, error). Signed-in pages need a test account that the owner provides; agents never ask for a password.

How a fix is made:

- The owner's direction of 2026-10-14 approves fixing the recorded bugs. Where the right behaviour is a product choice (the entry says `owner`), the agent writes the options with a recommendation and asks before fixing. Only the owner defers an entry.
- A fix to behaviour that a contract pins is a contract change: the fixtures and every implementation change in one commit and the version is raised, as in "How a route moves".
- Every fix comes with something that would catch the bug again: a contract case, a unit test, or, for a purely visual fix, written steps and the result of following them. The register entry records the task and commit.
- Entries marked `schema` wait for the database definitions that Phase 3 also needs.
- Dead code is not a bug. The register lists it separately for Phase 7.

### Phase 1 gates on 2026-10-12

The table above is dated 2026-10-11. This is where Phase 1 stood after `VERIFY-001`. Evidence for each line is in `../coordination.md`.

| Gate | State | Who can close it |
|---|---|---|
| Fixture parity, old and new, for search, summary, detail and contents | Met locally: every case passes against both | Done; repeat on each change |
| Invalid-input and upstream-failure tests | Met. Input rules approved by the owner and applied in `FIX-003` | Done |
| Explicit timeout and cache behaviour | Met in code. Production cache behaviour is not chosen | Owner, with hosting |
| Review findings (REVIEW-002) | 1 to 10 addressed; AUTH-001 implements per-user credentials for finding 11 and was reviewed in REVIEW-006 | Done locally; live-provider checks remain |
| Who may see private repositories | **Decided:** signed-in users, only their own GitHub account's access. API implemented; private UI and live OAuth checks remain | Agents; no repeated owner policy decision |
| Rewrite forwards requests unchanged | VERIFY-002 extends the probe to production and 49 requests including bearer forwarding and mismatch denial. On Vercel (VERIFY-005, 2026-10-24): 14 awkward trending queries through the switched website route matched Go direct exactly. Bodies and headers through Vercel's rewrite not yet checked there | Agent on an approved preview, for bodies and headers |
| Race detector | First hosted result recorded: run 38351494790 on `259ff7b`, success, read through `agent-handoff.mjs --status --ci` on 2026-10-13. Later commits each need their own run | GitHub Actions on each push |
| Hosting for the Go service | **Decided 2026-10-14: option A.** `sefgh-api` exists; trending served from it since 2026-10-15; `check-go-deployment.mjs` 7/7 on 2026-10-24 | Done |
| Staging latency and resource comparison | Outside response times measured on 2026-10-24 (MEASURE-001, `../verification/cutover-step1.md`): equal regions, routes without GitHub, no errors in 220 requests, medians equal within the network round trip, Go's tail shorter in three of four series. CPU, memory, outbound counts and GitHub-backed time not measured | Owner (Vercel observability), then an agent |
| Tested rollback | Met locally. Not tested under real traffic | Needs hosting |
| Peer review | REVIEW-004: Codex reviewed GO-005a/b, FIX-003/004, VERIFY-001 and OPS-001a. REVIEW-005: Claude Code reviewed GO-007b, lesson 18 and AI-001a, and the logging and decoding of GO-006b. REVIEW-006: Claude Code reviewed AUTH-001 and AUTH-002 by deliberate breaks and fixed the gaps. REVIEW-007 (2026-10-24): Claude Code reviewed CI-001, VERIFY-002 and VERIFY-003; three deliberate forwarding breaks were each caught, no defect found. The rest of GO-006b, and the fixes made in REVIEW-005 and REVIEW-006, await independent review | Assigned reviewer |

## Recorded differences between Go and Next.js

Anything the fixtures cover is identical. These are deliberate and outside the fixtures:

| Difference | Reason |
|---|---|
| RepoSync: monitoring rows are written inline, not on background threads | The original's threads lose rows (R-197) and make the order unstable; inline writes are recorded in the same order |
| RepoSync: a stop request finishes the current topic; in-flight requests are not cancelled | Matches the original's Ctrl+C; cancelling requests would save a half-fetched topic as complete |
| Browser data proxy: only public-schema objects are served; supplied schema headers must all say public, and the outgoing method explicitly selects public | Policy names are for that schema, regardless of the Data API deployment's default. User-token verification and RLS still belong to the Data API |
| Browser data proxy: redirects are refused; a redirect returns a local Data API-shaped 502 | Keep caller credentials and write bodies at the configured destination; clone the client instead of changing shared settings |
| Onboarding/search history: 24 seconds for identity, incoming body and database work together, with a retained connection read deadline | Per-call timeouts do not interrupt incoming Body.Read; one budget fits inside the 30-second server write limit |
| Avatar: six-MiB request bound, 24-second whole workflow (including identity and inbound reading), connection read deadline, ten seconds per upstream call, eight-MiB replies and no redirects | Bounds memory/time and confines the caller's credential to the configured project; the existing five-MiB file limit is preserved |
| Avatar: best-effort cleanup finishes before responding, within a three-second child budget; parse-error text is fixed rather than Node-version-specific | No detached post-response goroutine for a serverless platform to abandon; the cleanup selection and failure response remain fixture-compatible |
| Go abandons a GitHub call after 10 seconds; Next.js has no timeout | A backend must bound upstream waits. Both answer the same generic failure |
| Go bounds the whole repository detail route, which makes three calls, to 25 seconds | The server allows 30 seconds to write a reply. Without one deadline a slow GitHub could push the route past that and drop the connection |
| Go treats a GitHub reply over 16 MB as a failure | Bounds memory. A full page of results is under 2 MB |
| Go adds `X-Sefgh-Backend: go` | Shows which backend answered during rollout and rollback |
| Go sends the six security headers itself | Next.js adds them to its own responses but not to responses it forwards. A Go test fails if the two lists drift |
| Methods other than GET and HEAD get Go's standard 405 | The registered GET pattern also accepts HEAD; method parity is outside the current fixtures |
| Contributions: a count or total from GitHub that is not a JSON number is passed through, not converted as JavaScript would | No fixture pins JavaScript's conversion, and reproducing it for every JSON type is not worth the risk |
| Contributions: a GitHub status that cannot carry a body, such as 304, answers 500 | The Next.js handler reaches the same 500 through its catch block |
| Activity: Go reads a Supabase bearer, not the session cookie | Go does not parse Supabase SSR cookies. The browser sends the bearer (`src/lib/supabase/session-fetch.js`), as it does for chat |
| Starred: all GitHub reads of one request share a 14-second budget; a row not checked in time gets null metadata | The Next.js handler has no bound. A long collection and a slow GitHub could otherwise outlast the server's 30-second write timeout and drop the reply |
| Activity: the database call is bounded to 10 seconds and 8 MiB and follows no redirect; a count that is truthy but not a number answers 500 | Bounds memory and time, and keeps the user's token at the Data API. JavaScript would add such a count as text; the column holds numbers |
| Trending developers: at most four repository lookups run at once, each reply is limited to 2 MiB and the whole request to 25 seconds, and every lookup has ended before the reply is sent | Next.js starts all twenty at once with no limit and can leave some running after it has answered. The reply is the same |
| Trending developers: a login that is a number keeps the digits GitHub sent, so `1.0` is looked up as `1.0` where JavaScript prints `1` | A login is never a number, and copying JavaScript's number formatting is not worth the risk. A Go test pins it |
| Trending developers: a repository reply that is a JSON object counts as no repositories even if it has a `length` field, where Next.js answers 500 | GitHub answers with a list. A Go test pins it |
| A reply that starts with two byte-order marks is refused; Node 21 accepts it | The fetch standard removes one mark. Node removes a second by accident of its implementation |
| Trending and trending developers write one log record for a failed request, without the address | Next.js uses `console.error`. Operators need the cause; the contract fixes only the reply |
| AI routes: a request body is limited to 1 MiB, a provider reply to 4 MiB and a provider call to 25 seconds | The Next.js handlers set none of these. A backend must bound what it reads and how long it waits; 25 seconds stays inside the 30-second write limit |
| AI routes: a failure is logged with its stage and the provider's status, never the query or the provider's words | Next.js logs the whole error with `console.error`, which can repeat what a user typed |
| AI routes: lower-casing follows Go except for the dotted capital I, which is written as JavaScript writes it | Only that character could make a query match the built-in ASCII lists differently. The Greek final sigma also differs and cannot |
| AI routes: half of a surrogate pair written alone as a JSON escape in a request, such as `\ud83d`, is read as U+FFFD; JavaScript keeps it | Go's JSON decoder replaces it, and a decoder of our own is not worth the risk. Lengths agree, one unit either way, and text a person types does not contain one. Only what reaches the provider differs |
| AI routes: any method but POST gets Go's 405, OPTIONS included; Next.js answers OPTIONS itself with 204 and an Allow header (checked in `next/dist/.../auto-implement-methods.js`) | The browser calls these routes from the same origin, so it never sends a preflight. Recorded in AI-002c; it was already true of the two search helpers |
| Chat: only a Supabase bearer signs a caller in; Next.js also accepts its own session cookie | Go must not parse Supabase SSR cookies (see Authentication above). The browser sends the bearer since AI-002c |
| Chat: a request body may be up to 4 MiB, where the search helpers allow 1 MiB | The browser sends the whole conversation every time. 4 MiB stays below the 4.5 MB a Vercel function accepts, which is the limit Next.js meets there |
| Share: the visitor's bearer goes to the database without asking Supabase Auth first, and a header that is not a bearer counts as signed out; Next.js reads the session cookie | The route needs no user id, and the Data API checks the token itself: a refused token answers 404 in both. Go must not parse Supabase SSR cookies |
| Data API URLs are written with URLSearchParams' encoding (`jscompat.FormEncode`), byte for byte as supabase-js writes them; until SHARE-001 Go used `url.QueryEscape`, which differs on `*` and `~` | The database read both the same way. The share contract pins the exact URL, and one encoding for every route is simpler to check |
| Collect: a POST body over 1 MiB is answered as one that cannot be read (500), and the bearer is read by `githubaccess.SessionToken`, which share now uses too | Next.js on Vercel accepts up to 4.5 MB and reads the session cookie. A backend must bound what it reads, and every route must read a bearer by the same rules |
| Vote: a vote's three database calls (write, stats function, count) share one 24-second budget; one cut short reads as failed | Each call may take 10 seconds; three after the 4-second sign-in would outlast the 30-second write timeout. Next.js has no bound |
| Comments: each comment's details (profile, admin lookup, reply count) run for at most four comments at once within one 16-second budget, and the first rejection cancels the rest; a POST's three calls share a 20-second budget | Next.js starts every comment's lookups together with no bound, and lets the others run on after `Promise.all` rejects. A backend must bound its work and its time |
| Videos: each video's uploader lookups run for at most four videos at once within one 16-second budget, and the first rejection cancels the rest; a POST's two calls share a 20-second budget | As for comments: Next.js starts every lookup together with no bound, and lets the others run on after `Promise.all` rejects |
| Shares: a request body that is not JSON is answered with Go's own text (V8's own only for an empty or blank body), where Next.js sends the JavaScript engine's parse error | That text changes between Node versions, so no implementation can pin it; the cases pin the status and that an error text is sent. Sending it at all is R-089 |
| Shares: the link starts with `NEXT_PUBLIC_SITE_URL` from the Go server's environment, or else the forwarded host and scheme, where Next.js uses the request's own origin | Behind a proxy, Go sees the proxy's request, and Next.js's proxy forwards the browser's host but not its scheme |
| Data proxy: a request is not checked with Supabase Auth before it is forwarded | The Data API verifies the token on every request, as it always did for the browser; an extra Auth call would double each request's time. The proxy adds rules about tables, methods and fields, not identity |
| Data proxy: Next.js's rewrite writes the query again, so its percent-encoding may differ (`%2A` arrives as `*`) | The Data API decodes the query, so the meaning is the same; the forwarding probe gives queries as supabase-js writes them |
| Data proxy: an update of `user_stats` is refused, where the browser's client may make it | Nothing calls it, and it would let a user set their own stats (R-103); the direct path stays open until the write rule changes |

## Decisions log

| Date | Decision |
|---|---|
| 2026-10-28 | Owner approved R-203: trending contract version 4 starts the search at a UTC time, so "daily" is the last 24 hours. Go only, as for R-068 (BUG-024) |
| 2026-10-28 | Owner answered the Phase 6 decision pack (`../plans/phase6-owner-decisions.md`): every recommendation except section 4's R-002, R-004, R-005, R-007, R-008 and R-051, which stay visible as they are, deferred, features to be built later. R-017 is asked again |
| 2026-10-28 | Owner accepted the HLD's recommendations for D1 to D8 (`../architecture/hld.md`): D1 A (own Supabase project for the corpus, reusing the paused Repo-DB after a read of what it holds), D2 A (`pg_cron` ticks to the Go worker), D3 a hosted 768-dimension model stored as `halfvec`, D4 C (no LLM summaries in version 1), D5 start small, D6 A (local ES256 check), D7 measure then decide, D8 A for signed-in users. RepoSync is wanted and is to be rebuilt better inside that plan; until then the recommended design stands |
| 2026-10-28 | Owner asked to resume the playground keys "if possible". Resuming means approving the one-replacement proposal (`../database/keys-dev-replacement-review.md`, SHA-256 `f212c12e9a17f88bec2137d3fd7da636e5a3e0d6d1d970237785d5092d10dde3`) and running it with the reviewed operator in the Supabase dashboard. The explicit approval of that exact proposal is asked for; until it is given, the signing stop stands |
| 2026-10-28 | Owner: `sefgh.org` is renewed in November. One test account is provided, in a file outside the repository whose contents are never copied |
| 2026-10-24 | Owner: "from now all deployments will be done in this repo" (R-066, option A); `sefgh.org` will be renewed later (R-065), and the site this repository deploys is `sefgh-main.vercel.app` meanwhile. The owner set `GITHUB_PUBLIC_READ_TOKEN` on both projects (verified: 5,000 an hour) and switched cutover step 1 for **Preview** on `sefgh-main` (reported; the preview sits behind Vercel's sign-in, so agents could not check it). Test accounts for Phase 3: option A, two accounts the owner creates |
| 2026-10-24 | Owner approved applying the R-186 migration ("yeah you can go ahead") after a test on the development project, then "continue the migration". Tested on dev against the real Storage server, rollback included, then applied to User-DB with the MCP `apply_migration` tool (history `20261024093212`); verify 5/5 `ok`. Rollback: `../../supabase/checks/avatar_002_rollback.sql` |
| 2026-10-23 | Owner chose option A for R-041 and R-186 ("go for your recommendation for both"). R-041: fixed once in Go after the avatar route is cut over, with `contracts/upload-avatar` version 2 dropping the `listBuckets()` check and answering "Failed to upload avatar"; nothing changes in Next.js. R-186: one migration replaces the two public SELECT policies on `storage.objects` with an own-folder SELECT for `authenticated` and drops the duplicate write policies (`supabase/migrations/20261023120000_avatar_002_own_folder_reads.sql`). Under the 2026-10-15 rule it runs only after the owner approves that file. Options and evidence: `../database/avatar-storage.md` |
| 2026-10-19 | Owner chose a Go policy proxy for the remaining browser data areas (notifications, profile, user stats, home, submissions, search stats, conversations, the repository page's reads, activity): the browser's Supabase client sends those areas' Data API requests to `/api/data/{area}/rest/v1/...`, and Go forwards each unchanged with the caller's own token after checking `backend/internal/dataproxy/policy.json` (tables, methods, writable fields). Per-operation logic can move into Go later. Owner also chose local commits per chunk when the Git Agent is not committing |
| 2026-10-19 | Owner chose how the browser's own database calls move behind Go: a per-area list in a public build setting (`NEXT_PUBLIC_SEFGH_GO_DATA`), each browser module calling Go or Supabase directly by it; rollback by removing the area and redeploying. Plan and order: `../plans/browser-data.md` (DATA-PLAN-001) |
| 2026-10-19 | Owner answered R-077 with option A: no stored trending table; Go serves the topic searches live, cached by the CDN. Nothing writes shared data, so no worker privilege is needed. Options: `../plans/trending-refresh.md` |
| 2026-10-18 | Owner answered R-039: build real keys, show once, store hashes only, validate on explicitly supported endpoints, and account on the server; prepare database changes for review before applying. Execution plan: `../plans/playground-keys.md`. This is more than porting the existing creation route; schema and lifecycle gates remain. R-090: owner chose to preserve current share-removal behavior until Go cutover, then fix it in Go. No live Next.js fix is authorized for R-090 by this answer |
| 2026-10-11 | Go chosen over Rust (this ADR) |
| 2026-10-11 | All 13 defects recorded in search contract version 1 are fixed in the Next.js handler; contract moves to version 2. Details in `../../contracts/github-search/README.md` |
| 2026-10-12 | Owner approved input validation for the repository routes (REVIEW-002 finding 1). Applied in `FIX-003`: repository contract version 3, Next.js and Go together |
| 2026-10-12 | Corrected earlier interpretation: the owner chose private access for signed-in users only to repositories their own GitHub account can access. This does not authorize sharing the server token's permissions |
| 2026-10-13 | Owner authorized implementing Codex's recommendations, including CI-001 and API authorization. Contracts change in Next and Go together. No deployment or route cutover is implied |
| 2026-10-13 | Owner decided the AI policy, answering the four questions in "AI routes: decisions needed before a port". Chat: signed-in users only, 30 requests per five minutes per user, the most recent 20 messages and 8,000 characters per request. Suggestions and enhance-query: anyone, 30 AI calls per five minutes per address, queries of at most 500 characters. Fix three recorded defects in Next.js and Go together: internal and provider error text returned to callers; a caller's system message replacing the application's; unchecked message shapes. Other recorded defects stay |
| 2026-10-13 | Owner approved a server token for anonymous GitHub reads, on condition that it can read only public data. It is a new variable, separate from `GITHUB_TOKEN`. Not implemented yet (`QUOTA-001`) |
| 2026-10-15 | Owner approved and applied the SEC-001 migration ("apply"; run in the Supabase SQL editor) and switched trending to Go on `sefgh-main` ("yeah switch to go": `SEFGH_GO_API_URL` and `SEFGH_GO_ROUTES=github-trending`, then a redeploy). Trending is the first route the website serves from Go. Rollback: remove `github-trending` from `SEFGH_GO_ROUTES` and redeploy. The Next.js handler stays until Phase 7. Leaked-password protection (R-080) needs Supabase's Pro plan, outside the free-tier budget, so it was not turned on |
| 2026-10-15 | Owner gave agents full access to the Supabase projects through the MCP connection ("you can have full access i give permission"). Claude Code still reads with catalog queries and changes the production database only by a migration in `supabase/migrations/`, each approved by the owner before it runs (SEC-001) |
| 2026-10-15 | Owner chose to fix trending (R-068) once, in Go: contract version 3 changes the GitHub query, the Go handler is the implementation of record, and trending is the first route to switch to Go, since it needs no credentials. The Next.js handler keeps the old query until it is retired. The owner created the new website project `sefgh-main` and will create the Go project `sefgh-api`. Task BUG-007 |
| 2026-10-14 | Owner chose hosting option A, a second free Vercel project rooted at `backend/`, preview first ("yes go ahead"). The owner creates it from `../hosting-setup.md`. The owner offered full Supabase access; Claude Code asked for read-only (reasons in `../coordination.md`, "Owner decisions pending"). Task OPS-002 |
| 2026-10-14 | Owner: backend bugs are fixed once, in Go; no fixing in Next.js and then again in Go. Browser code (React) is not migrating, so UI bugs are fixed there. For a backend route, the fix lands in Go when the route is cut over and its Next.js handler retired; until then the bug stays recorded. A port still reproduces the Next.js behaviour first, defects included, so the two can be compared before cutover. A security, privacy or data-loss bug in live Next.js code is still fixed where it is live, at once. This makes cutover, and so hosting, the way backend fixes reach users |
| 2026-10-14 | Owner: Google Analytics loads for everyone for now ("we need data for growth"); consent will be asked later, as the user base grows. Replaces the consent-first choice made earlier the same day. Visitors can still opt out. Dates: the agent's choice, for code and users (one en-IN formatter, as for numbers). The trending Star button links to the repository on GitHub. Making GitHub sign-in mandatory was raised as a question, not decided |
| 2026-10-14 | Owner answered four Phase 6 questions. Sessions tab (R-049): show only what Supabase can report, the current session, plus "sign out everywhere". Google Analytics (R-055): load only after the visitor consents; the owner was unsure, so it was done as the reversible choice. Number format (R-053): Indian grouping, the same on server and browser, everywhere. Trending "stars today" (R-020): replace the random number with a real measure, which changes the trending contract in Next.js and Go |
| 2026-10-14 | Owner added a phase in which all bugs and broken UI/UX are recorded and fixed before the cleanup phase. It is Phase 6; retiring old logic becomes Phase 7 and waits for it. Fixing recorded bugs is approved; product choices are still asked; contract fixes follow the usual rule. See "Phase 6" under Phases and gates |
| 2026-10-12 | Owner stated hosting: Next.js on Vercel, database on Supabase, and that the owner holds the GitHub, Vercel and Supabase accounts. Token permissions are not yet verified |
| 2026-10-12 | Owner set the budget: free tier only. No paid resource is to be created without the owner's approval |
| 2026-10-11 | Go is installed for the owner's Windows user at `%LOCALAPPDATA%\Programs\Go` (version 1.27.2, official archive, checksum verified, user PATH updated). No administrator rights were used |

Open, for the owner:

- **Target architecture (ARCH-001, 2026-10-24, proposal):** [`../architecture/hld.md`](../architecture/hld.md) and [`../architecture/lld.md`](../architecture/lld.md) describe the whole backend behind the UI, including the Phase 4 and 5 pipeline (one Go worker, a job table in a separate Corpus DB, one embedding space). Eight decisions, D1 to D8, need the owner's answer before any of it is built.
- The search navbar sends `sort=stars` and `sort=updated`, which the API ignores. Recorded as `defect` cases. Either teach the API those names or change the navbar to send the names the API knows.
- **Private implementation and verification (agents).** Policy is decided. AUTH-001 removes server-token fallback from the five migrated dynamic GitHub handlers. Private UI integration, other server-token call sites, independent review and live OAuth verification remain. No production token permissions were inspected.
- How the Go service will be hosted within Vercel's free tier, and how production routing and rollback will work. The owner has stated the app runs on Vercel; the deployment itself has not been inspected. See the hosting proposal below.
- Public and guest policy for the AI endpoints, and playground key semantics, before Phase 2 and 3. Four specific decisions, with recommendations, are in "AI routes: decisions needed before a port" below.

## Hosting proposal (decided 2026-10-14: option A; nothing deployed yet)

The owner chose option A on 2026-10-14 ("yes go ahead"), free. `../hosting-setup.md` is the step-by-step guide; `backend/vercel.json` sets the Go preset and `scripts/check-go-deployment.mjs` checks a deployment from outside. Vercel's documentation, read again that day, still says what is below, and adds: Hobby is "restricted to non-commercial personal use only"; files outside the Root Directory are not available to the build (the server needs none); Standard Protection guards preview and generated URLs but not production domains, so Next.js calls the Go project's production address.

Written by Claude Code on 2026-10-12 for the owner to choose from. The facts about Vercel are from its documentation as read that day. **None of this has been tried in this project**, and the owner's Vercel account has not been inspected.

What the documentation says:

- Vercel runs Go servers. The Go runtime and "Services" (several services in one project) are both marked Beta and are listed as available on every plan, including the free one.
- A Go service must be a `main` package that listens on the port in the `PORT` environment variable. `backend/cmd/api` reads `PORT` since `OPS-001a` (2026-10-12): `SEFGH_API_ADDR` still wins when set, and with neither set the server stays on `127.0.0.1:8787`. Whether Vercel's Go runtime is satisfied by exactly this has not been tried.
- Vercel's Go preset looks for `go.mod` at the service root and an entry point such as `cmd/api/main.go`. `backend/` already has that shape.
- A function is stateless. An instance may be reused, but nothing in memory is promised to survive. The summary route's in-process cache would therefore work only some of the time. Production cache behaviour is already a cutover gate.
- On the free plan a function may run for up to 300 seconds, and a request or response body may be at most 4.5 MB. The Go handlers finish within 30 seconds. A GitHub reply above 4.5 MB would fail there, as it would for the Next.js handlers today.

| Option | How it works | For | Against |
|---|---|---|---|
| A. A second Vercel project with its root set to `backend/` | The Next.js project sets `SEFGH_GO_API_URL` to that project's address and names routes in `SEFGH_GO_ROUTES`: the switch that already exists | Uses the switch and the rollback already tested locally. A route is turned off by removing its name and redeploying Next.js. No new routing file | The Go service has its own public address, so it can be called without going through Next.js. Two projects to keep in step. One more network hop per request |
| B. One project using Vercel Services | A `vercel.json` names two services and sends chosen `/api/github/...` paths to the Go one | One deployment and one rollback for both. Same address for everything | Beta. A layout where one service's folder sits inside the other's is not documented. Routes would be switched in `vercel.json`, a second mechanism beside the tested one. Once a path is sent to a service, a 404 from it does not fall back to Next.js |

Recommendation: **A, on a preview deployment first**, because it changes nothing that has been tested. B is the tidier end state and can be revisited when Services leaves Beta.

Either way, in this order. Step 1 is done; every later step waits for the owner's go-ahead:

1. Make `backend/cmd/api` honour `PORT`. Done in `OPS-001a`, with no deployment.
2. After approval, create a protected preview project rooted at `backend/`, with the `go` framework preset. Start with health/languages and no GitHub credential. The frontend switch does not disable direct backend requests. Verify Hobby eligibility (personal/noncommercial) and allowance first; free hosting is conditional. Configure Supabase's public URL/key only when testing the bearer boundary. Never add a private-capable shared GitHub token for public callers.
3. Run `scripts/contracts/go-forwarding-probe.mjs`'s path list against the preview, with routes still off in production.
4. Take the measurements in the next section.
5. Switch on one route that sends no token, `github-languages`, and practise the rollback.

Nothing here needs a paid resource according to the documentation. That is a reading of the pricing pages, not a measurement; check the usage page after the first preview.

## AI routes: decisions needed before a port (decided 2026-10-13)

**Decided.** The owner answered all four questions on 2026-10-13; the answers are in the decisions log above and took the recommendation in each row below. AI-002a applied them to the Next.js handlers and raised the three AI contracts to version 2. The Go ports, AI-002b and AI-002c, follow. The rest of this section is the proposal as it was put to the owner.

Written by Claude Code on 2026-10-13. All three AI routes are now recorded as fixtures: suggestions (AI-001a, 35 cases), enhance-query (AI-001b, 62) and chat (AI-001c, 42). No provider was contacted, and nothing about the live site, its keys or its usage was inspected. The Go ports wait for the four answers below, because each one changes what the port has to do.

What the fixtures show today:

- None of the three routes checks who is calling or how often.
- Chat sends any caller's messages to GitHub Models with the server's `GITHUB_TOKEN`. A caller who includes a system message replaces the application's instructions, so the route works as an open relay to the model, paid for by that token.
- Chat returns the provider's error text to the caller.
- Enhance-query calls OpenAI or Anthropic with `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, using model names fixed in the source.
- Nothing streams. `streamAIResponse` only throws.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Who may call each route | (a) anyone, as today; (b) signed-in users only; (c) anyone, with a small allowance for visitors and a larger one for signed-in users | Chat: (b). It is the expensive route and the only one that carries a conversation. Suggestions and enhance-query sit in the public search box: (c). Whether the chat page is meant to work signed out was not established from the source |
| 2 | Limits per caller and per request | Requests per period; messages per request; characters per request | Start with fixed limits in the Go process: 20 messages and 8,000 characters per chat request, 500 characters per query, 30 requests per five minutes per caller. They are starting values to adjust from real usage, not measurements. A counter in one process does not hold across instances, so a shared counter in Supabase is the later step and needs its table definition first |
| 3 | Keys and providers | Keep three keys and three providers; or one provider for all three routes; a key for AI separate from the GitHub API token | Give AI its own key, not the variable the GitHub API code reads. Confirm with each provider that the address and model named in the source are still served before porting them: that was not checked here, and a retired model or address would already be failing on the live site |
| 4 | Which recorded defects to fix in the port | Reproduce all of them; or fix a named set in Next.js and Go together, with a version change | Fix the three that affect safety, in both implementations: provider and internal error text returned to callers; a caller's system message replacing the application's; unchecked message shapes. Leave the cosmetic ones (word-list matches, title fallback) recorded |

Once answered, the port is three bounded tasks: a session check that reuses the Supabase half of `backend/internal/githubaccess`, with the limits; suggestions and enhance-query; chat. Each stays off by default like every other route.

## Measurements

Before any cutover, capture p50 and p95 response time, upstream time, error rate, process CPU and memory, and outbound request counts at representative load, under equal cache conditions, payloads, regions and concurrency. For chat, add time to first token if streaming is introduced. For search and analysis, add retrieval quality on a fixed corpus and embedding cost. Set acceptance thresholds from the baseline, not from an invented speedup.

## Consequences

- Next.js and Go both run during the migration. CI, observability, secrets and deployment must cover both. CI-001 now provides contracts, Go race/vet/format, lessons and production forwarding; a hosted result has not been observed.
- A full custom-backend migration includes significant frontend data-access refactoring and database policy work, not only route handlers.
- Every contract fix must land in two implementations until a route's Next.js handler is retired.
- Managed Auth, Storage and Realtime stay. This ADR does not approve replacing them.

## Next bounded tasks

See `../coordination.md` for owners and state. In order:

1. `GO-002a` and `GO-002b` are implemented and peer-reviewed (REVIEW-002):
   acceptable with routes disabled, not approved for cutover.
2. `GO-003` addresses the review's cache, logging, URL and test findings while
   preserving contract version 2. Review the fixes before enabling any route.
3. Close Phase 1 gates: owner-approved URL-input contract changes and token
   scope verification, race-detector run, encoded-segment rewrite checks,
   production cache behavior, hosting, staging measurements and tested rollback.
4. Phase 2 is a separate bounded task with its own public/guest and AI policy
   decisions; work on it does not waive any earlier route's cutover gates.

Phase 2 implementation update (2026-10-12): GO-004 starts with the public static
`github/languages` read, selected because it uses no identity, network or state.
Its version-1 fixtures pin the full existing catalog and headers before its Go
port. Go embeds the catalog with the standard `embed` package and the route
stays off unless `github-languages` is explicitly enabled. No existing contract
was changed. GO-003/GO-004 peer reviews and all cutover gates remain open.
GO-005a (2026-10-12) characterized `github/contributions` against stubbed
GitHub GraphQL replies: contract version 1, 95 cases, the Next.js handler
unchanged, no Go code. Eighteen cases are `defect`. Two findings bear on
whether to port it at all: nothing in this checkout calls the route, and its
date range depends on the server's time zone. The owner then chose to port it. GO-005b (2026-10-12) is that port, in
`backend/internal/githubcontributions`, off unless `github-contributions` is
enabled, reproducing all 18 `defect` cases as recorded, with lesson 13. Next
bounded Phase 2 implementation: `GO-006a`, characterize `github/trending`.
Keep AI and stateful domains behind their existing policy/schema gates.

VERIFY-001 (2026-10-12) checked rewrite forwarding in `next dev` and could not
run the race detector; see "Phase 1 gates on 2026-10-12" above. OPS-001a
(2026-10-12) made `backend/cmd/api` read `PORT`, with lesson 15; it deployed
nothing.

Progress records and test outcomes belong in `../coordination.md`. The earlier
phase table is dated 2026-10-11; it is not a claim that later work is absent.


### AUTH-002 / VERIFY-003 / GO-006a (2026-10-13)

Owner authorized continued implementation after the alignment review. Repository
page reads and authenticated collection enrichment now use validated, uncached,
tokenless public GitHub reads; no shared private-capable token. Stored collection
metadata is not proof of current access: enrichment is rechecked and withheld
when unavailable, preserving collection rows and notes without database writes.
See contracts/public-repository-reads for fixtures and the quota tradeoff.
The public summary cache in Go is a separate unresolved visibility gate.

VERIFY-003 strengthens the existing probe to require exact Supabase bearer,
public key and known GitHub tokens; wrong-session rejection is added (50 cases).
GO-006a records 33 trending cases (13 defect) with fixed clocks/randomness.
GO-006b is the next Go port. Trending production behavior is unchanged; no defect
fix is implied by characterization. See contracts/github-trending/README.md.

Deployment wording: no agent-issued deployment is recorded. Automatic deployment
of pushed Next.js changes is unknown until Vercel is inspected. The Go switch
only controls forwarding; it cannot gate changes in Next.js handlers. OAuth
consent mechanism is still to be designed; the user's private-access policy is
already decided. Shared-token capacity, independent review, hosted CI and live
provider/hosting gates remain.

### GO-006b (2026-10-13)

Trending port implemented with only the standard library, contract v1 unchanged,
lesson 17 and `github-trending` default-off switch. Public-only verifier exemption
retains Next behavior with headers present; no caller or server token forwarded.
33 cases pass through Go handlers and local HTTP endpoints. A 10-second client
timeout, cancellation and 16 MiB reply limit are deliberate Go bounds. Clocks
retain host local calendar behavior; deployments must align time zones for
parity. Random starsToday remains a marked defect, not a measured signal.
Next Phase 2 route: trending-developers characterization (GO-007a). Existing
auth, cache, quota, review, hosted CI and cutover gates are not waived.

### GO-007a (2026-10-13)

Trending-developers version-1 contract records 48 cases, including 17 defects,
with clock/time-zone control and delayed enrichment replies. The Next handler
is unchanged. GO-007b should add bounded Go fan-out and a whole-request deadline
while preserving response contracts and input/result ordering; document runtime
bounds as deliberate differences. No token forwarding, direct database access
or new dependency is needed. Every behavior fix still requires a contract
revision in all implementations. See contracts/github-trending-developers.

### GO-007b and AI-001a (2026-10-13)

Owner requested batches of 2-3 related tasks. Developers port, lesson 18 and AI
suggestions characterization are one batch. Developers contract v1 unchanged,
standard library only, public-only verifier exception, opt-in switch. Explicit
Go bounds: four simultaneous enrichments, 2 MiB per reply, 10-second HTTP calls,
25-second overall deadline, workers joined before responding. Return order and
recorded failures preserved. AI suggestions has 32 cases/8 defects, using only
a stubbed generateAIResponse; no provider call, guest-policy approval or AI port
is inferred. A later AI implementation needs auth/guest, quotas and key policy.

REVIEW-005 (2026-10-13): Claude Code completed and reviewed that batch after
Codex's usage limit. Trending and trending developers now log failures and
share `jscompat.DecodeJSON`. Fixtures grew without a version change:
developers 57 cases, trending 34, AI suggestions 35. Five rows were added to
the recorded differences above. Next: characterize `ai/enhance-query` and
`ai/chat` the same way. No AI port before the owner's guest, quota and key
decisions.

AI-001b and AI-001c (2026-10-13): Claude Code recorded `ai/enhance-query` (62
cases, 10 defect) and `ai/chat` (42 cases, 16 defect) with only the provider's
HTTP call replaced. The chat fixtures run the real `src/lib/ai/github.js`, so
the provider request is pinned too. Every Phase 2 route now has fixtures; the
three AI ports wait for the owner's answers in the proposal above. Next work
that needs no decision: independent review of AUTH-001, AUTH-002, CI-001,
VERIFY-002 and VERIFY-003.

REVIEW-006 (2026-10-13): Claude Code reviewed AUTH-001 and AUTH-002 by changing
the code on purpose. The design held; the tests did not: in Go, handing the
public handlers the server's own token passed every test. The server is now
built by `newHandler`, which the tests call, and the shared access cases grew
from 15 to 35 with both implementations aligned on them. No contract version
changed. Live Supabase and GitHub behaviour is still unchecked.

AI-002a (2026-10-13): the three AI contracts are at version 2 in Next.js.
Chat needs a signed-in user and allows 30 requests in five minutes per user.
The search helpers allow 30 AI calls in five minutes per address and fall
back to their built-in answers past that. Queries are at most 500 characters.
Chat forwards only checked `role` and `content`, the most recent 20 messages
and 8,000 characters, and never returns internal or provider error text.
Limits live in `src/lib/ai/guard.js` and are counted per server process.
One difference is planned for the Go port and recorded here in advance: the
Next.js chat handler also accepts its own session cookie, which is how the
browser calls it today; Go will accept a bearer token only, so the browser
must send one before chat is served by Go.

AI-002b (2026-10-14): `ai/suggestions` and `ai/enhance-query` are ported to Go
against contract version 2, off unless `ai-suggestions` or `ai-enhance-query`
is enabled. Ten of 25 routes now exist in Go. New packages: `ailimit` (the
request counter, tested step for step against the JavaScript one),
`aiprovider` (the GitHub Models call), `aisuggestions`, `aienhance`. The AI
routes are served beside the GitHub access check. `GITHUB_TOKEN` is read by
the Go server again, as the GitHub Models credential only; the test that
forbids it on GitHub API routes still holds. Lesson 19. Next: AI-002c, chat.

AI-002c (2026-10-14): `ai/chat` is ported to Go against contract version 2,
off unless `ai-chat` is enabled. Eleven of 25 routes now exist in Go, and
Phase 2 has no route left to port. The sign-in check is
`githubaccess.Verifier.SignedInUser`, the Supabase half of the access check
with chat's rules. The browser now sends the Supabase access token as a
bearer with every chat request (`src/lib/ai/chat-request.js`); Next.js
accepted that already, so its behaviour is unchanged. Six fixtures were added
from the unchanged Next.js handler, four of them `defect`, including a
fallback title that keeps half of an emoji, which Go reproduces with
`jscompat.UTF16`. The shared bearer pattern now matches "Bearer" in ASCII
only, because Go's `(?i)` also let two non-ASCII letters through where
JavaScript does not. Four rows were added to the recorded differences; one of
them, OPTIONS answered 405, was already true of the two search helpers.
Lesson 20. No route is switched on, and every Phase 2 cutover gate remains.

PLAN-001 and BUG-001 (2026-10-14): the owner added Phase 6, bugs and broken
UI/UX, before retiring old logic, which is now Phase 7. `../bug-register.md`
opened with 47 entries from recorded evidence and a static scan of the source.
No page has been walked through in a browser yet (BUG-002).

QUOTA-001 (2026-10-14): the public read token the owner approved on
2026-10-13 is implemented in Next.js (`src/lib/github/public-token.js`) and Go
(`backend/internal/publictoken`), with one contract for both,
`../../contracts/public-read-token`. How "can read only public data" is made
checkable: the token must be a classic personal access token with no scopes,
which GitHub reports as an empty `X-OAuth-Scopes` header on `GET /user`. A
fine-grained token cannot be checked that way and is refused. Every reply is
checked again, and one that shows scopes or a 401 is discarded and the request
repeated without the token. It applies to signed-out reads of search,
repository summary, detail, contents, trending and trending developers, and
the repository page; not to contributions, whose contract would change. In Go
it is an `http.RoundTripper` given only to the signed-out handlers' clients.
No existing fixture changed. Unset, behaviour is unchanged; live use waits for
the owner to create and set the token. Lesson 21.

BUG-003 (2026-10-14): the first Phase 6 fixes. Dead links (R-001, R-003,
R-050), the profile's invented usage data (R-006, now read from
`/api/activity`), and the ten lint errors (R-043). Effects that only copied a
browser value into state now read it with `useSyncExternalStore` through
`src/hooks/useBrowser.js`. `npm run lint` passes and CI runs it. Two guards
joined the contract suite: `internal-paths.test.mjs` (links and API calls
that lead nowhere) and `usage-activity.test.mjs`. No contract, route or Go
code changed. A spot check of seven signed-out pages in headless Chrome, and
reading the code the fixes touched, added R-049 to R-057.

BUG-004, BUG-005 and ACT-001 (2026-10-14), carrying out the owner's four
answers of the same day. Numbers use Indian grouping everywhere through one
formatter, with lakh and crore written out for short forms (R-053). The
Sessions tab shows only what the browser and Supabase can report, with "Sign
out everywhere" (R-049); the ordinary Sign out now ends only this device's
session, where Supabase's default had ended every device's (R-058). Google
Analytics loads only after the visitor accepts it on the cookie bar (R-055).
Trending contract version 2 replaces the random `starsToday` with
`starsPerDay`, stars per day since the repository was created, and a heat
level computed from it, in Next.js and Go together (R-020). ACT-001 fixed two
bugs in `GET /api/activity` (R-056, R-057) and recorded it as contract
version 1, the first Phase 3 characterization; it is not ported, because
Phase 3 waits for the database definitions.

BUG-006 and ACT-002 (2026-10-14): under the owner's fix-once rule, BUG-006
fixed browser bugs in React, which stays (R-009, R-018, R-060, R-061, R-062,
and R-055 revised to analytics for everyone with an opt-out), and two
documentation entries (R-046, R-047). ACT-002 ports `GET /api/activity` to
Go at contract version 1, defects included, off by default. It is the first
Go route that reads the database: it asks the Supabase Data API with the
caller's own token and the public key, so row-level security decides as it
does now, and no service key is involved. Its tests also run the Next.js
handler on 400 generated inputs and compare every answer. Turning it on
still waits for Phase 3's gate (the table's definition and row-level
security, checked against the live project) and for hosting.

STAR-001 (2026-10-15): `GET /api/repo/starred` was recorded as
`contracts/repo-starred` (14 cases) by running the Next.js handler, and
ported to Go, off by default. It passes those cases and the 15 of
`contracts/public-repository-reads`. The Data API code shared with
activity moved to `internal/supabaserest`. Of the routes still only in
Next.js, the others write; their port waits for the database definitions.
The same day the Go service was hosted (`sefgh-api`), and trending on it
answered real data.

SEC-001 (2026-10-15): the owner connected the Supabase MCP with full
access, and Claude Code read User-DB's live definitions with catalog
queries only: `../database/user-db.md`. This meets the "obtain and verify"
rule for the two Phase 3 reads already ported: `activity_logs` and
`repo_collections` both let a user read only their own rows, so ACT-002 and
STAR-001, which read as the user, see what Next.js sees. The write routes
now have definitions to port against. The review found that anyone could
read every user's email, read or write any user's activity, and that any
account could rewrite trending (R-070 to R-074). The fix is a migration in
`../../supabase/migrations/`, dry-run on a local copy of the definitions
and not applied: applying it changes production and waits for the owner.
Profile reads now name their columns, which works before and after it.

SEC-001b (2026-10-15): the owner ran the SEC-001 migration in the Supabase
SQL editor, and the verify query showed all 13 checks true. The owner also
switched trending to Go on `sefgh-main`; the website's
`/api/github/trending` now answers from `sefgh-api` with real data, where
the Next.js handler answered 500 (R-068). It is the first route cut over.

SHARE-001 (2026-10-16): `GET /api/share/[token]` was recorded as
`contracts/share-token` (17 cases, 5 marked `defect`) by running the
Next.js handler with the real supabase-js around a stand-in Data API, and
ported to Go, off by default (switch `share-token`). Go passes every case,
comparing the database URL byte for byte. The share page sends the bearer.
Every read-only route now exists in Go; the remaining 11 routes write, or
are jobs.

COLLECT-001 (2026-10-17): `/api/repo/collect` was recorded as
`contracts/repo-collect` (49 cases, 1 marked `defect`) by running the
three Next.js handlers with the real supabase-js, and ported to Go, off by
default (switch `repo-collect`). It is the first Go route that writes: the
insert and the delete go with the caller's own token, so the table's
row-level security checks each write as it does now. The browser callers
send the bearer. Ten routes remain in Next.js only.

VOTE-001 (2026-10-17): `/api/repo/vote` was recorded as `contracts/repo-vote`
(37 cases, 5 marked `defect`) and ported to Go, off by default (switch
`repo-vote`). The port keeps the call to the missing stats function
(R-076) so the two can be compared. Shared request helpers moved into
`jscompat`. Nine routes remain in Next.js only.

RATING-001 (2026-10-17): `/api/repo/rating` was recorded as
`contracts/repo-rating` (52 cases, 8 marked `defect`) and ported to Go, off
by default (switch `repo-rating`). Its check and average follow JavaScript's
loose rules for text and numbers, copied in `jscompat` (`Number`, `Add`,
`MathRound`) with answers from Node, so the two can be compared (R-085).
Eight routes remain in Next.js only.

CVOTE-001 (2026-10-17): `/api/repo/comments/vote` was recorded as
`contracts/comment-vote` (25 cases) and ported to Go, off by default (switch
`comment-vote`). Seven routes remain in Next.js only.

COMMENTS-001 (2026-10-17): `/api/repo/comments` was recorded as
`contracts/repo-comments` (50 cases, 6 marked `defect`) and ported to Go,
off by default (switch `repo-comments`). The author lookups are copied as
they fail today (R-075, R-040). Six routes remain in Next.js only.

VIDEOS-001 (2026-10-17): `/api/repo/videos` was recorded as
`contracts/repo-videos` (47 cases, 4 marked `defect`) and ported to Go,
off by default (switch `repo-videos`). Its YouTube pattern runs over UTF-16
units with JavaScript's `\s` and `.` (`jscompat.FindSubmatchUTF16`), so it
finds the id JavaScript finds. The uploader lookups are copied as they fail
today (R-075, R-040). Five routes remain in Next.js only.

SHARE-002 (2026-10-17): `/api/conversations/[id]/share` (POST, DELETE) and
`/api/share/[token]/fork` (POST) were recorded as `contracts/conversation-share`
(45 cases) and `contracts/share-fork` (23 cases) and ported to Go, off by
default. Both send error text to the browser as it is (R-089), which the port
copies, except a JSON parse error's text, which comes from the JavaScript engine
and is pinned only as text (`engine_message`). `upsert_shared_conversation` is
called as before, as the user; its body is not versioned here and nothing about
the write changes. A failed removal still reports success (R-090). Three routes
remain in Next.js only: `playground/keys`, `upload-avatar` and `trending/refresh`.

AVATAR-001a/b (2026-10-18): `POST /api/upload-avatar` recorded as
`contracts/upload-avatar` version 1 (45 cases, 23 marked defect) and ported to
`internal/avatar`, standard library only. The switch `upload-avatar` is off by
default. Identity, Storage, Auth metadata and profile writes use the caller's
own token. Lesson 31 explains bounded streams and deadlines. Two of the original
25 API routes remain without a Go implementation: `playground/keys` (R-039;
real lifecycle/schema gate) and `trending/refresh` (R-077; worker privileges and
atomic replacement). No browser data-operation migration or cutover is implied.

TREND-PLAN-001 (2026-10-19): the options for R-077 are written in
`../plans/trending-refresh.md`. Recommended: no stored table, with Go serving the
topic searches live behind the CDN's cache, so nothing needs a privileged
write; the alternatives keep the table (a secret-gated replace function, or a
least-privilege Postgres role) or remove the topic sections. Waiting for the
owner. BUG-009 the same day made three wall-clock tests check deadlines instead
of speed (R-091).

TREND-001a (2026-10-19): `GET /api/trending/topics` implemented in Go as
`internal/trendingtopics`, off by default (switch `trending-topics`), with a
hand-written contract, `contracts/trending-topics`, since there is no Next.js
handler. It found that GitHub refuses the old topic searches (R-101), so it
searches the same words as text. Next: TREND-001b, the page reads it and R-100
is fixed; then TREND-001c retires the refresh route and proposes dropping the
table.

TREND-001b (2026-10-19): the trending page reads `/api/trending/topics`
(`src/lib/trending-topics.js`) instead of the table, shows each repository once,
and no longer claims the data is old (R-100). With the switch off the call is a
404 and the page shows the main list only, as before.

DATA-PLAN-001 and DATA-001a (2026-10-19): the plan for the browser's own
database calls is `../plans/browser-data.md` (25 files, 19 tables, 3 functions;
the owner chose a per-area build setting for switching). The first area, search
history, is characterized as `contracts/search-history` with a new runner for
browser modules (`scripts/contracts/browser-db-fixture.mjs`). It found R-102.

DATA-001b (2026-10-19): search history is served by `internal/searchhistory`
and the browser module asks it when `NEXT_PUBLIC_SEFGH_GO_DATA` lists
`search-history`; the same setting adds the rewrite. The module falls back to
Supabase on a 404, so the setting alone never breaks the area. The browser's
user id is only a filter checked against the verified caller. Off by default.

DATA-002 (2026-10-19): onboarding is served by `internal/onboarding` behind
the same setting. Its module decides by error codes, so Go answers each
database call's own `{ data, error }` (`supabaserest.Result`), checked against
answers the real postgrest-js produced. Updates are limited to the fields the
onboarding writes. Off by default.

DATA-PROXY-001 (2026-10-19): the other nine areas of the plan go through
`internal/dataproxy`, switched by the same setting (`src/lib/go-areas.mjs` is
the browser's copy of the area list, checked against the Go policy). Requests
pass unchanged; what the policy does not allow is refused in the Data API's
own error shape. The proxy does not ask Supabase Auth: the Data API checks the
token, as before. The browser's database calls are now all reachable through
Go except the playground's (KEYS-001) and dead code (Phase 7). Off by default.

DATA-REVIEW-001 / BUG-011 (2026-10-20): Codex independently reviewed Claude Code's search-history, onboarding and data-proxy implementations. Controlled tests found R-106/R-107/R-108 (redirects, schema selection, incoming body/whole-route limits). Go-only fixes preserve existing JSON contracts. Independent reviewer James accepted the final safety fixes with switches off. Lesson 38 and lessons 34-36 explain them. Evidence and remaining live/preview gates: `../verification/browser-data-review.md`. No cutover or deployment is implied.

REVIEW-011 / BUG-012 (2026-10-20): the owner chose a separate labeled section for global 30-day/all-language topic highlights. The main trending list keeps its filters; the topic search timestamp belongs only to the highlights. Go's topics contract remains version1. Browser request generations/cancellation, truthful active-list refresh and render-boundary validation address R-109 through R-112. Chat snapshot loading has one owner (the direct selection wrapper); same-account metadata changes do not trigger reloads, and cleared/superseded selections cannot restore an old snapshot (R-113/R-114). These are browser fixes, not backend contract changes or cutover approval. Evidence: `../verification/trending-ui-review.md`.

### PHASE5-001: frozen worker evidence (2026-10-20)

The independent Phase 5 work may proceed while the playground catalog gate remains closed. Source candidates stay separate: Google and Ollama vectors, task/prefix rules, vector columns, RPC parameters and result shapes are not interchangeable. A standard-library **offline** comparator verifies claimed experiment identity before top-k ranking/score comparison and reports optional per-query baseline relevance metrics. It adds no API route, external integration, dependency or runtime switch. Source snapshots and synthetic examples do not satisfy live corpus/quality/recovery gates. Details and next sequence: [worker plan](../plans/analysis-search-workers.md), [evidence format](../../contracts/semantic-search/README.md). No authoritative pipeline or quality threshold has been selected by inference.

PHASE5-002 / BUG-013 (2026-10-20) incorporates independent packaged/legacy lineage evidence (40 pinned source files), records additional provenance/recovery/control-plane defects, and corrects the offline tool's case/Unicode JSON aliases, physical source containment and LF-normalized example hashes. These are migration-tool corrections; worker/corpus/schema and live parity gates remain open. REVIEW-013 supersedes premature REVIEW-012 acceptance for the reproduced tooling gaps.

Owner decision, 2026-10-20: deployment is not confirmed; keep worker execution gated. PHASE5-001/002 offline foundation does not choose a pipeline or authorize running any worker. Obtain deployment/corpus evidence first.

### KEYS-CORE-001 / BUG-014 (2026-10-20)

The accepted hashed/show-once/server-accounting direction permits an independent unwired standard-library credential/lifecycle core while existing schema evidence is unavailable. Explicit policy and separate management/accounting interfaces are required; a test-only atomic shared store is a conformance model, not evidence of live RLS or production distributed quotas. Eleven proposed core scenarios are separate from the old HTTP contract. Proposed format/charging/limits are not approved rollout values. Actual adapters, SQL review, authentication/provider budgets, recovery/retention and browser flows remain gated. See [key plan](../plans/playground-keys.md).

The current plaintext handler has an immediate privacy correction under AGENTS' security/privacy exception: no-store on every response and a fixed failure log with no provider/database payload. Current contract advances to version2, preserving status/body/ownership/write/retry behavior; version1 synthetic evidence retained. No Go implementation of that HTTP route yet exists. This does not close R039 or change database/route switches. Owner offered catalog restoration, but the expected SEFGH project is not visible through the current connection; no other project queried or SQL applied. Worker execution remains explicitly gated.

### KEYS-HTTP-001: unregistered HTTP boundary (2026-10-20)

Dependency-free KEYS-001b work may continue with a separate proposed HTTP
contract: bearer-only management at /api/v1/keys and public API-key search at
/api/v1/search. The session factory must verify the Supabase bearer and bind
management to that same user's token; no ordinary CRUD service-role shortcut.
The search adapter owns its transport, omits ambient/caller credentials and
proxies, refuses redirects, and validates explicit public result visibility.
Successful output is bounded/buffered until accounting completion, then checked
again for cancellation. Recovery receives only a safe exact receipt under a
separate short budget. These interfaces/mock tests do not establish durable
SQL/RLS/quotas/recovery. No runtime registration, default enablement or new
deployment setting. Limits/charging/expiry remain synthetic proposals. Actual
catalog, owner-reviewed SQL/rollout, adapter conformance, browser/forwarding and
cutover remain gates. See [HTTP contract](../../contracts/api-key-http/README.md).

### KEYS-DB-001: catalog-backed SQL/RPC capabilities (2026-10-21)

The named SEFGH connection now permits catalog-only verification of expected
User-DB. The hashed/show-once direction has an additive review-only SQL proposal
and unregistered standard-library Go adapters. SQL generates material/derives
owner, then makes atomic quota decisions with its post-lock clock. Management
retains the verified user bearer. Separate NOLOGIN/NOBYPASSRLS accounting has
designated RPC grants; effective PUBLIC/inherited access still requires hosted
verification. No policy, credential provisioning, live apply or runtime switch.
Exact safe receipt comparison and indexed history/recovery pages address
contradictory completion and starvation. Go preserves the proposed HTTP array
within18s/100pages and fails closed above its cap. Recovery worker, retention,
UI pagination, trusted role-JWT rotation, hosted gateway/two-user tests and
rollout settings remain activation gates. Review SQL before apply. Rollback
retains hashes/audit; no legacy conversion/revocation. R143 hardening is separate.
See [SQL review](../database/keys-001-review.md).

### KEYS-UI-001 / BUG-017 (2026-10-21)

The accepted show-once direction now has a separate build-time UI gate,
`NEXT_PUBLIC_SEFGH_KEYS_V1=1`, off by default. It mounts no legacy key/usage
components, sends only fixed same-origin bearer requests, treats uncertain
creation as requiring metadata refresh, and confines the secret to dialog state.
Reference and pasted-key testing describe public repository search only.
No Go registration, rewrite, policy value, SQL apply or deployed setting is
included. Existing legacy behavior remains until an approved transition.
[UI evidence](../verification/playground-key-ui.md) distinguishes local synthetic
browser proof from hosted SQL/Auth/accounting and actual rollout gates.

### KEYS-STAGE-001 / KEYS-RECOVERY-001 (2026-10-21)

Owner chose a separate development/test Supabase project, rotation to v1 and
old-key revocation only at a separately approved cutover. The isolated project
is created; owner-approved additive SQL is applied in development only and
catalog/definition checks pass. Policy/provisioning/runtime gates remain. [Staging record](../database/keys-staging.md) names the target,
review bundle and acceptance sequence. Unknown worker deployment continues to
gate worker execution.

Standard-library `RecoverCompletionPage` receives only pending discovery and
idempotent completion capabilities. One invocation validates a page before
writes, scans at most an explicit1..100rows within a positive budget capped at
30seconds, retries exact saved receipts and leaves missing ones unknown. Its
cursor stops before an unconfirmed completion and is only a scan position;
fresh scans revisit earlier unknown rows. No scheduler, provider replay,
automatic abandonment, quota reservation, retention or HTTP registration is
introduced. Recovery startup while admissions are disabled remains a runtime
design gate; broader credentials are not a substitute. Lesson44 is generated.

Owner's tutorial policy (2026-10-21): continue generating/updating lessons, but
make solution test/vet/build optional. Default handoff/CI explicitly skip
lessons; `--lessons` and manualCI `verify_lessons` opt in. Contract/backend
verification remains required, and a skip is never recorded as a pass.

### KEYS-RECOVERY-002 / KEYS-ACCEPT-001 (2026-10-22)

Recovery capability startup is separated from admission policy. `OpenRecovery`
validates a bounded pending read using the supplied role credential and returns
a separate concrete Go wrapper with only Pending/Complete methods. This avoids
widening by type assertion; it does not narrow the underlying JWT's SQL grants.
No scheduler, minting, runtime registration or policy activation is introduced.

The hosted acceptance tool targets only the already approved isolated project,
requires explicit mutation flags and supplied sessions/accountant token, calls
no provider and retains no raw credentials in its reports. It exercises the
SQL gateway, separately from Go HTTP/UI acceptance. New test keys are revoked
with independent, confirmed cleanup; audit and unknown accounting state remain.
The owner separately approved the exact test-policy SQL and one provider-free
dev run once credentials are available; the policy is applied/readback verified
only in `mraglhrenqwadegvwxts`, without lifecycle data. Identity/signer provisioning
still needs separate owner review. Managed signing-key extraction, user Auth-hook changes and service-role
CRUD are not workarounds. [Setup and review](../database/keys-hosted-acceptance.md).

### KEYS-PROVISION-001b / BUG-022 (2026-10-23)

The owner approved the exact development identity/signing proposal and later
generated non-deliverable test labels. The trusted local Node operator is
reviewed and remains outside app/Go runtime. It confines issuance to one fixed
300second accountant token without owner subject, verifies online owner
sessions/freshness and exact gateway readiness, makes one exclusive run claim,
isolates the child environment and retains only allowlisted acceptance evidence.
Supported interruption preserves independently acknowledged session cleanup.

The first approved key was imported standby, exposed by an agent snapshot of
an asynchronous private form, and revoked before activation. Original managed
key stayed current; no users, sessions, JWT or acceptance run were created.
Private form observation now uses control presence/state without full trees,
values, screenshots or raw errors. Exact SQL/policy is unchanged, no runtime
credential or extra import is inferred from the original approval. The
[one replacement addendum](../database/keys-dev-replacement-review.md) requires
an owner decision; [containment](../database/keys-provisioning-incident-2026-10-23.json)
does not assert transcript erasure, cache purge or active-token rejection.

Owner decision2026-10-23: **keep signing changes stopped; continue other
migration work**. The replacement is not authorized. Continue independent
source/verification work without new signing changes, credentials or live runs.
