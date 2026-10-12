# Claude Code review and reconciliation

> Later decision, 2026-10-11: the owner chose Go instead of Rust (`adr/0002-go-backend.md`). This file records a review of the Rust proposal as it happened and is not rewritten. Its findings about the application do not depend on the language. Where it says Rust or SQLx, the current plan says Go and `pgx`.

Date: 2026-10-11. Source baseline: `42759dd`. Reviewer: installed local Claude Code 2.1.286, invoked by Codex at the user's request. This is a curated summary of its actual review, not a claim that Claude shares Codex's chat history.

## Review method

Claude ran in non-interactive restricted/plan mode with only Read, Glob, and Grep tools, with MCP disabled for the review. The prompt excluded edits, shell execution, agent spawning, secrets, settings, and private session history. It reported reading about 15 of the 25 API route files in full and covering the remainder through search. The process exited successfully and returned a substantive architecture review.

## Findings accepted after Codex source checks

- Browser Supabase access is a major backend boundary and must be included in an eventual full application-backend migration.
- Session refresh and the auth callback need to remain coherent during a staged port.
- App database schemas, RLS, RPC bodies, triggers, and bucket policies are not versioned in this repository.
- AI endpoint auth/quotas, plaintext playground keys, browser-written usage logs, comment admin lookups, conversation read-modify-write, and trending refresh authorization/recovery need explicit treatment.
- Next fetch-cache behavior needs an equivalent when its handler moves.
- Keep managed Supabase services initially; use contract tests, user isolation tests, and rollback per domain. No measured Rust performance benefit has been established.

## Differences resolved in the proposal

| Claude suggestion or wording | Codex reconciliation |
|---|---|
| First slice includes GitHub proxies and trending-refresh cron | Limit the first slice to search/repository reads. Cron writes to the database, requires verified permissions, and clears current data before replacing it. It is not stateless. |
| SQLx connections bypass RLS | More precisely, database role, table ownership/BYPASSRLS, RLS configuration, and session claims determine authorization. SQLx does not itself bypass RLS. Prefer user-JWT Data API calls initially. |
| GitHub cache settings are the only rate-limit protection | Existing source also has request sequencing and some client caching. The actionable finding is inconsistent token/cache handling and no comprehensive shared upstream budget, not an absolute absence of every protection. |
| Keep thin CRUD wrappers managed until RLS strategy settles | Keep them temporarily, but an eventual all-custom-backend Rust target includes their migration and the browser data calls. |
| Production is likely Vercel | Unverified. Analytics dependency and cron comments do not establish deployed topology. No hosting claim or migration decision is based on this inference. |

Codex also inspected selected sibling Python entry points and found distinct semantic-search contracts (`embedding`/`match_repo_analysis` versus `description_embedding`/`match_repos_*`). These were outside Claude's initial review scope and are explicitly added to the shared backend map.

## Shared-document readback

Completed successfully in a second read-only Claude invocation. Claude read all six shared files, agreed with the staged scope and reconciled boundaries, and independently checked the route/handler count, RPC names, package declarations, and search contract. It did not independently inspect sibling Python source or re-count the 22 tables.

The readback caught the inherited-object-key sort fallback bug and requested more precise search fixtures, explicit handling of untracked documents before worktrees, and separation of contract preparation from Rust implementation. These were incorporated. Codex refined one reviewer detail: infinite `page` survives the clamp, but infinite `per_page` becomes 100. The reviewer suggested fresh permission for routine checks; the shared workflow instead follows existing user authorization and does not add a blanket approval requirement. Deterministic fixtures do not require live GitHub calls.

## Codex Go-plan readback — 2026-10-12

Scope: SYNC-001, documentation synchronization at `2b4f880` on `go-backend`. This is not the pending line-by-line review of FIX-001, GO-001 or LEARN-001. See `coordination.md` for the checks rerun and the complete handoff.

Agreement:

- ADR-0002 is accepted; ADR-0001 is historical and must not be implemented.
- Search contract version 2, the opt-in Go search route, and nine Go lessons exist. The remaining Phase 1 routes are still future work; implementation, peer review and cutover are distinct states.
- Managed Supabase stays. Browser business-data calls and the eventual chosen Python worker pipeline remain in full migration scope. Database authorization depends on roles, policies and claims, not the choice of database driver. Trending cron writes remain outside the first read slice.
- Every backend Go change requires the corresponding tutorial update. Owner exercises and FIX-002 stay reserved for the owner.

Corrections applied to shared documentation:

- Removed assertions of equivalent Go/Rust latency, lowest memory use and measured build advantages: no such comparative measurements exist here.
- Replaced unconditional merge-safety wording with pending review status; Next.js search fixes would take effect on merge even with Go routing disabled.
- Corrected the ADR's 405 wording to exclude HEAD as well as GET, consistent with the server's GET route registration and backend README.
- Clarified that the backend map's original source-only audit predates Claude's later reported local runtime checks.

No contracts or implementation decisions changed. Existing tests passed, but fixture completeness, implementation parity outside covered cases, switch behavior and lesson accuracy still require the six requested review items. Claude has not reviewed or acknowledged this new documentation diff.
