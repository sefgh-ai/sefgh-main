# ADR-0001: Staged migration of SEFGH application backend to Rust

Status: **Proposed**. Date: 2026-10-11. Decision owner: project owner. Reviewers: Codex and local Claude Code.

## Context

The user is considering moving all backend work to Rust and wants Codex and Claude Code to coordinate. The current app mixes 25 Next.js API route files, direct browser Supabase access, Next.js session handling, database RPCs, and separately checked-out Python ingestion/analysis services. See `../backend-map.md` for source evidence and limitations.

No rewrite has started. No performance, cost, traffic, or production service topology baseline is available. Live RLS/schema, the authoritative analysis implementation, and the intended Rust hosting environment remain unverified.

## Proposed decision

Use one modular Rust application API first, with separate worker processes when background ingestion/analysis is ported. Keep the Next.js UI and managed Supabase Auth/Postgres/Storage/Realtime initially. Use endpoint-by-endpoint routing or thin Next adapters to preserve frontend contracts and permit rollback.

Interpret the eventual objective as moving custom application/backend logic to Rust. Replacing Supabase's managed identity, database engine, storage infrastructure, or realtime service is a separate decision. Browser business-data operations would move behind Rust domain by domain; retaining direct Auth/Realtime SDK use is compatible with this target but must be explicit. Python services remain temporarily until the active pipeline and parity criteria are established, then can be ported as separate slices. They are not silently excluded from the long-term scope.

### Candidate Rust components

- Axum/Tokio for HTTP and async work; Tower middleware for tracing, limits, and timeouts.
- Serde for typed JSON contracts and Reqwest for upstream HTTP calls.
- Initially call the existing Supabase Data API/RPCs with the verified user's JWT for user operations, preserving the established RLS identity boundary.
- Consider SQLx for direct Postgres access only after database roles, policies, and transaction-local claims are designed and tested. SQLx itself neither provides nor automatically bypasses RLS: the connection role, ownership/BYPASSRLS attributes, and claims determine behavior.
- Keep one deployable API with domain modules before introducing microservices. Background workers may require a different process/runtime lifecycle.

These are candidates, not installed packages or version commitments. Check current crate documentation and pin tested versions at implementation time. Axum supports Tokio and Tower; see its [official crate documentation](https://docs.rs/axum/latest/axum/) and [middleware documentation](https://docs.rs/axum/latest/axum/middleware/).

### Authentication and authorization

Keep `src/proxy.js` and `/auth/callback` initially. For protected Rust endpoints, accept an access token obtained through the existing session flow or forwarded by a thin session-aware Next adapter. Rust must verify signature, issuer, audience, expiry, and supported algorithm; never trust a client-supplied user ID or unsigned token claims.

Confirm the project's signing-key mode. Asymmetric keys can be verified with Supabase JWKS and rotation-aware caching; legacy symmetric signing needs an appropriate verified strategy. Do not assume JWKS covers every existing project. See [Supabase signing keys](https://supabase.com/docs/guides/auth/signing-keys) and [JWT guidance](https://supabase.com/docs/guides/auth/jwts).

Do not use a service-role credential for ordinary user CRUD. It bypasses RLS and changes the security model. Retain explicit owner/capability checks and preserve user-scoped Data API calls; use narrowly scoped worker privileges separately. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Choose same-origin routing and test cookies, CSRF protection for cookie-authenticated mutations, streaming, and headers. CORS configuration alone does not establish authentication. A Rust service does not make the Next.js session layer unnecessary.

## Options considered

| Option | Complexity | Benefit | Main cost/risk | Assessment |
|---|---|---|---|---|
| Improve existing Next.js backend | Low to medium | Fastest path to fix auth controls, caching, concurrency, and tests | Business logic remains distributed until refactored | Valid if the goal is mainly speed or delivery cost |
| Staged Rust API and workers | Medium to high | Explicit contracts, typed domain logic, centralized custom backend over time | Two runtimes during migration; Rust operating/tooling requirements | Recommended if Rust is a deliberate long-term direction |
| Rewrite everything at once, including managed services | Very high | Maximum infrastructure ownership | Auth/data/realtime/embedding regressions; slow rollback; unproven payoff | Not recommended |

Rust may improve CPU and memory characteristics for suitable work, but the inspected handlers primarily await GitHub, AI, and database services. End-to-end latency improvements are unproven. Benchmark dependency time separately from application time.

## Migration sequence and completion gates

| Phase | Bounded work | Required evidence before cutover |
|---|---|---|
| 0: establish contracts | Inventory callers; obtain schema/RLS/RPC/trigger/storage definitions for affected domains; record fixture contracts and baseline metrics; identify active Python services | Versioned evidence, reproducible current behavior, unresolved discrepancies recorded |
| 1: first Rust read path | Start with `/api/github/search`, then the two repository detail routes and contents; preserve browser-facing paths | Old/new fixture parity; invalid-input/upstream-failure tests; timeouts/cache behavior; staging latency/resource comparison; tested rollback |
| 2: remaining GitHub and AI | Contributions/languages/trending reads; then AI proxy with verified JWT/guest policy, quotas, cancellation, and separately versioned streaming behavior | Public-vs-auth policy settled; quota enforcement; old JSON compatibility; streaming consumer tests if introduced |
| 3: user data | Move browser conversation/history/profile/notification and other domain operations behind Rust, plus repo interaction/sharing/playground routes | Two-user isolation tests; RLS/ownership equivalence; revoked/private-share behavior; atomic conversation writes; realtime parity; hashed key lifecycle and server accounting |
| 4: jobs and storage orchestration | Trending refresh with staging/atomic promotion, avatar workflow, RepoSync ingestion | Idempotency, retries, checkpoints, partial-failure recovery, separate worker privileges, storage authorization tests |
| 5: analysis/search workers | Port the chosen RepoAnalyser pipeline and semantic search orchestration | Model/dimension/vector-column/RPC agreement; fixed-corpus retrieval evaluation; result mapping; ingestion throughput and failure-recovery parity |
| 6: retire old business logic | Remove replaced handlers/direct browser business-data calls and temporary adapters once unused | Caller audit; no dual writes; rollback observation period complete; documented remaining Next Auth/SSR and managed-service boundaries |

A minimal read-only Phase 1 spike does not depend on completing unrelated domain schema work, but no database mutation is migrated before its own schema and policy gates pass.

For every slice: implement behind an opt-in route/domain switch; test success and failure cases; review with the other agent; promote only when the existing authorization covers deployment; retain a route-level rollback. Do not dual-write to compare stateful implementations. Compare read fixtures or safe shadow reads instead.

## Measurements

Capture p50/p95 response time, upstream time, error rate, process CPU/memory, cache hit rate, and outbound request counts at representative load. For chat, add time to first token if streaming is implemented. For search/analysis, add retrieval quality on a fixed corpus and embedding cost. Compare equal cache conditions, dependencies, payloads, regions, and concurrency. Define acceptance thresholds from the baseline rather than inventing a speedup target.

## Consequences and unresolved decisions

- The initial topology still runs Next.js and Rust; CI, observability, secrets, and deployment need to cover both.
- A full custom-backend migration includes significant frontend data-access refactoring and database policy work.
- Managed Auth/Storage/Realtime are retained initially; this proposal does not approve their replacement.
- Confirm which sibling Python checkout/corpus is active and whether it is part of the first delivery milestone.
- Confirm hosting, rollback routing, operating budget, and team Rust familiarity before choosing deployment-specific tooling.
- Resolve public AI/guest behavior, playground key semantics, and intentional contract fixes before implementing them.
- Rust tooling (`cargo`, `rustc`) was not found on this session's PATH; this is not proof it is absent elsewhere. No toolchain was installed.

## Next bounded task

`RUST-001a` (complete, pending Codex review): fixture contracts for GitHub search are in `../../contracts/github-search/` and the lint/build baseline is in `../backend-map.md`. The fixtures use controlled upstream stubs and no live GitHub traffic. Thirteen cases are marked `defect`; the owner has not yet decided which of them a port should fix rather than reproduce.

`RUST-001b`: after the owner selects the Rust direction, record the task owner and base commit, verify/install the required toolchain within the authorized scope, and create a small Rust service implementing that one read path behind an opt-in adapter. The other agent reviews the contract and diff. No production routing or data migration is part of this first implementation task.
