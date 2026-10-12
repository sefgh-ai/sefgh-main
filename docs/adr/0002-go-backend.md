# ADR-0002: Staged migration of the SEFGH application backend to Go

Status: **Accepted** by the project owner on 2026-10-11. Supersedes [ADR-0001](0001-rust-backend.md), which proposed Rust and was never accepted. Reviewers: Codex and Claude Code.

This document stands alone. Nothing in ADR-0001 needs to be read to follow it.

## Context

The owner wants the custom backend moved out of Next.js. The current app mixes 25 Next.js API route files, direct browser Supabase access, Next.js session handling, database RPCs, and separately checked-out Python ingestion and analysis services. See `../backend-map.md` for the source evidence and its limits.

ADR-0001 proposed Rust. Before any Rust was written, the owner asked whether Go would be better and chose Go. The reasons recorded at the time:

- Nearly every handler waits on GitHub, an AI provider, or Supabase. For that work Go and Rust respond in about the same time, because the wait is upstream.
- Go is simpler to read and maintain, builds in seconds, and its standard library covers HTTP, JSON and concurrency without third-party packages.
- Rust's real advantage here was stricter handling of `null` versus a missing JSON key. The contract fixtures already catch that mistake in any language.

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

Confirm the project's signing-key mode first. Asymmetric keys can be verified with Supabase's JWKS and rotation-aware caching; legacy symmetric signing needs its own verified strategy. See [Supabase signing keys](https://supabase.com/docs/guides/auth/signing-keys) and [JWT guidance](https://supabase.com/docs/guides/auth/jwts).

Do not use a service-role credential for ordinary user operations. It bypasses RLS and changes the security model. Call the Supabase Data API and RPCs with the verified user's token, so the existing RLS identity still applies. Give workers their own narrowly scoped privileges. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Keep same-origin routing through Next.js, and test cookies, CSRF protection for cookie-authenticated mutations, streaming and headers. The first route, GitHub search, is public and needs none of this.

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
| Staged Rust API and workers | Strictest compile-time checks, lowest memory use | Slower builds, steeper learning curve, more dependencies; its advantages are not this app's bottleneck | Not chosen |
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

## Recorded differences between Go and Next.js

Anything the fixtures cover is identical. These are deliberate and outside the fixtures:

| Difference | Reason |
|---|---|
| Go abandons a GitHub call after 10 seconds; Next.js has no timeout | A backend must bound upstream waits. Both answer the same generic failure |
| Go treats a GitHub reply over 16 MB as a failure | Bounds memory. A full page of results is under 2 MB |
| Go adds `X-Sefgh-Backend: go` | Shows which backend answered during rollout and rollback |
| Go sends the six security headers itself | Next.js adds them to its own responses but not to responses it forwards. A Go test fails if the two lists drift |
| Non-GET methods get Go's standard 405 | Not part of any caller's contract |
| Query bytes that are not valid UTF-8 may decode to a different number of replacement characters | Left unspecified by the contract |

## Decisions log

| Date | Decision |
|---|---|
| 2026-10-11 | Go chosen over Rust (this ADR) |
| 2026-10-11 | All 13 defects recorded in search contract version 1 are fixed in the Next.js handler; contract moves to version 2. Details in `../../contracts/github-search/README.md` |
| 2026-10-11 | Go is installed for the owner's Windows user at `%LOCALAPPDATA%\Programs\Go` (version 1.27.2, official archive, checksum verified, user PATH updated). No administrator rights were used |

Open, for the owner:

- The search navbar sends `sort=stars` and `sort=updated`, which the API ignores. Recorded as `defect` cases. Either teach the API those names or change the navbar to send the names the API knows.
- Where the Go service will be hosted, and how production routing and rollback will work. Production topology is still unverified; Vercel is suspected, not confirmed.
- Public and guest policy for the AI endpoints, and playground key semantics, before Phase 2 and 3.

## Measurements

Before any cutover, capture p50 and p95 response time, upstream time, error rate, process CPU and memory, and outbound request counts at representative load, under equal cache conditions, payloads, regions and concurrency. For chat, add time to first token if streaming is introduced. For search and analysis, add retrieval quality on a fixed corpus and embedding cost. Set acceptance thresholds from the baseline, not from an invented speedup.

## Consequences

- Next.js and Go both run during the migration. CI, observability, secrets and deployment must cover both. There is no CI for either today.
- A full custom-backend migration includes significant frontend data-access refactoring and database policy work, not only route handlers.
- Every contract fix must land in two implementations until a route's Next.js handler is retired.
- Managed Auth, Storage and Realtime stay. This ADR does not approve replacing them.

## Next bounded tasks

See `../coordination.md` for owners and state. In order:

1. `GO-002a`: fixtures for `github/repo`, `github/repo/[owner]/[repo]` and `github/contents/[owner]/[repo]`, passing against the Next.js handlers.
2. `GO-002b`: port those three routes to Go against the fixtures.
3. Owner decisions above, as they become blocking: hosting before any deployment, AI policy before Phase 2.
