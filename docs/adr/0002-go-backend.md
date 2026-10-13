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
| 1: first read paths | `/api/github/search`, then the two repository detail routes and contents | Fixture parity old and new; invalid-input and upstream-failure tests; explicit timeout and cache behaviour; staging latency and resource comparison; tested rollback | Search implemented in Go and passing all fixtures; switch and rollback tested locally. Not deployed, no staging comparison, not cut over |
| 2: remaining GitHub and AI | Contributions, languages, trending reads; then the AI proxy with verified token or guest policy, quotas, cancellation, and separately versioned streaming | Public-versus-authenticated policy settled; quota enforcement; old JSON compatibility; streaming consumer tests if introduced | Not started |
| 3: user data | Browser conversation, history, profile, notification and other domain operations behind Go; repo interaction, sharing and playground routes | Two-user isolation tests; RLS and ownership equivalence; revoked and private share behaviour; atomic conversation writes; realtime parity; hashed key lifecycle and server-side accounting | Not started. Blocked on database definitions |
| 4: jobs and storage | Trending refresh with staging and atomic promotion, avatar workflow, RepoSync ingestion | Idempotency, retries, checkpoints, partial-failure recovery, separate worker privileges, storage authorization tests | Not started |
| 5: analysis and search workers | The chosen RepoAnalyser pipeline and semantic-search orchestration | Model, dimension, vector-column and RPC agreement; fixed-corpus retrieval evaluation; result mapping; ingestion throughput and recovery parity | Not started |
| 6: retire old logic | Remove replaced handlers, direct browser business-data calls and temporary adapters | Caller audit; no dual writes; rollback observation period complete; remaining Next.js and managed-service boundaries documented | Not started |

A read-only Phase 1 route does not wait for unrelated schema work. No database mutation moves before its own schema and policy gate passes.

### Phase 1 gates on 2026-10-12

The table above is dated 2026-10-11. This is where Phase 1 stood after `VERIFY-001`. Evidence for each line is in `../coordination.md`.

| Gate | State | Who can close it |
|---|---|---|
| Fixture parity, old and new, for search, summary, detail and contents | Met locally: every case passes against both | Done; repeat on each change |
| Invalid-input and upstream-failure tests | Met. Input rules approved by the owner and applied in `FIX-003` | Done |
| Explicit timeout and cache behaviour | Met in code. Production cache behaviour is not chosen | Owner, with hosting |
| Review findings (REVIEW-002) | 1 to 10 addressed; AUTH-001 implements per-user credentials for finding 11 and was reviewed in REVIEW-006 | Done locally; live-provider checks remain |
| Who may see private repositories | **Decided:** signed-in users, only their own GitHub account's access. API implemented; private UI and live OAuth checks remain | Agents; no repeated owner policy decision |
| Rewrite forwards requests unchanged | VERIFY-002 extends the probe to production and 49 requests including bearer forwarding and mismatch denial. Not checked on Vercel | Agent on an approved preview |
| Race detector | First hosted result recorded: run 38351494790 on `259ff7b`, success, read through `agent-handoff.mjs --status --ci` on 2026-10-13. Later commits each need their own run | GitHub Actions on each push |
| Hosting for the Go service | **Open.** Proposal below | Owner |
| Staging latency and resource comparison | Not started. Needs hosting | Owner, then an agent |
| Tested rollback | Met locally. Not tested under real traffic | Needs hosting |
| Peer review | REVIEW-004: Codex reviewed GO-005a/b, FIX-003/004, VERIFY-001 and OPS-001a. REVIEW-005: Claude Code reviewed GO-007b, lesson 18 and AI-001a, and the logging and decoding of GO-006b. REVIEW-006: Claude Code reviewed AUTH-001 and AUTH-002 by deliberate breaks and fixed the gaps. CI-001, VERIFY-002 and VERIFY-003, the rest of GO-006b, and the fixes made in REVIEW-005 and REVIEW-006 await independent review | Assigned reviewer |

## Recorded differences between Go and Next.js

Anything the fixtures cover is identical. These are deliberate and outside the fixtures:

| Difference | Reason |
|---|---|
| Go abandons a GitHub call after 10 seconds; Next.js has no timeout | A backend must bound upstream waits. Both answer the same generic failure |
| Go bounds the whole repository detail route, which makes three calls, to 25 seconds | The server allows 30 seconds to write a reply. Without one deadline a slow GitHub could push the route past that and drop the connection |
| Go treats a GitHub reply over 16 MB as a failure | Bounds memory. A full page of results is under 2 MB |
| Go adds `X-Sefgh-Backend: go` | Shows which backend answered during rollout and rollback |
| Go sends the six security headers itself | Next.js adds them to its own responses but not to responses it forwards. A Go test fails if the two lists drift |
| Methods other than GET and HEAD get Go's standard 405 | The registered GET pattern also accepts HEAD; method parity is outside the current fixtures |
| Contributions: a count or total from GitHub that is not a JSON number is passed through, not converted as JavaScript would | No fixture pins JavaScript's conversion, and reproducing it for every JSON type is not worth the risk |
| Contributions: a GitHub status that cannot carry a body, such as 304, answers 500 | The Next.js handler reaches the same 500 through its catch block |
| Trending developers: at most four repository lookups run at once, each reply is limited to 2 MiB and the whole request to 25 seconds, and every lookup has ended before the reply is sent | Next.js starts all twenty at once with no limit and can leave some running after it has answered. The reply is the same |
| Trending developers: a login that is a number keeps the digits GitHub sent, so `1.0` is looked up as `1.0` where JavaScript prints `1` | A login is never a number, and copying JavaScript's number formatting is not worth the risk. A Go test pins it |
| Trending developers: a repository reply that is a JSON object counts as no repositories even if it has a `length` field, where Next.js answers 500 | GitHub answers with a list. A Go test pins it |
| A reply that starts with two byte-order marks is refused; Node 21 accepts it | The fetch standard removes one mark. Node removes a second by accident of its implementation |
| Trending and trending developers write one log record for a failed request, without the address | Next.js uses `console.error`. Operators need the cause; the contract fixes only the reply |

## Decisions log

| Date | Decision |
|---|---|
| 2026-10-11 | Go chosen over Rust (this ADR) |
| 2026-10-11 | All 13 defects recorded in search contract version 1 are fixed in the Next.js handler; contract moves to version 2. Details in `../../contracts/github-search/README.md` |
| 2026-10-12 | Owner approved input validation for the repository routes (REVIEW-002 finding 1). Applied in `FIX-003`: repository contract version 3, Next.js and Go together |
| 2026-10-12 | Corrected earlier interpretation: the owner chose private access for signed-in users only to repositories their own GitHub account can access. This does not authorize sharing the server token's permissions |
| 2026-10-13 | Owner authorized implementing Codex's recommendations, including CI-001 and API authorization. Contracts change in Next and Go together. No deployment or route cutover is implied |
| 2026-10-13 | Owner decided the AI policy, answering the four questions in "AI routes: decisions needed before a port". Chat: signed-in users only, 30 requests per five minutes per user, the most recent 20 messages and 8,000 characters per request. Suggestions and enhance-query: anyone, 30 AI calls per five minutes per address, queries of at most 500 characters. Fix three recorded defects in Next.js and Go together: internal and provider error text returned to callers; a caller's system message replacing the application's; unchecked message shapes. Other recorded defects stay |
| 2026-10-13 | Owner approved a server token for anonymous GitHub reads, on condition that it can read only public data. It is a new variable, separate from `GITHUB_TOKEN`. Not implemented yet (`QUOTA-001`) |
| 2026-10-12 | Owner stated hosting: Next.js on Vercel, database on Supabase, and that the owner holds the GitHub, Vercel and Supabase accounts. Token permissions are not yet verified |
| 2026-10-12 | Owner set the budget: free tier only. No paid resource is to be created without the owner's approval |
| 2026-10-11 | Go is installed for the owner's Windows user at `%LOCALAPPDATA%\Programs\Go` (version 1.27.2, official archive, checksum verified, user PATH updated). No administrator rights were used |

Open, for the owner:

- The search navbar sends `sort=stars` and `sort=updated`, which the API ignores. Recorded as `defect` cases. Either teach the API those names or change the navbar to send the names the API knows.
- **Private implementation and verification (agents).** Policy is decided. AUTH-001 removes server-token fallback from the five migrated dynamic GitHub handlers. Private UI integration, other server-token call sites, independent review and live OAuth verification remain. No production token permissions were inspected.
- How the Go service will be hosted within Vercel's free tier, and how production routing and rollback will work. The owner has stated the app runs on Vercel; the deployment itself has not been inspected. See the hosting proposal below.
- Public and guest policy for the AI endpoints, and playground key semantics, before Phase 2 and 3. Four specific decisions, with recommendations, are in "AI routes: decisions needed before a port" below.

## Hosting proposal (not decided, nothing deployed)

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
