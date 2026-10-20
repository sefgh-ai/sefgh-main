# Trending and browser migration review: REVIEW-011 / BUG-012

Date: 2026-10-20 (Asia/Calcutta). Base: main `5d07218`.
Owner: Codex. Independent read-only reviewer: Mill (Codex agent).
Status: implementation/review/local verification complete; switches unchanged, not deployed.
Commit at handoff: uncommitted; verify Git Agent receipt separately.

## Scope and decisions

Codex independently reviewed Claude Code's TREND-001a/b: six topic searches,
query encoding/time window, partial/all-failed responses, public-only credentials,
shared cache policy, mapping, actual wiring and page integration. Mill independently
reviewed BUG-010 (React callbacks/effects, counts, images, profile columns and CSP),
then reviewed Codex's resulting browser fixes. No Go production code or JSON
contract fixture changed. No legacy route/table was retired.

The owner explicitly chose separate global topic highlights on 2026-10-20.
The main list keeps its filters. Highlights are labeled "last 30 days, across all
languages", with their timestamp only in that section. The Go topics contract
remains version 1. Lesson 33 and the plan reflect this decision.

## Reproduced findings and fixes

| Entry | Evidence before fix | Result |
|---|---|---|
| R-109 | Deferred older fetches replace newer filter results/errors/loading; unmounted work writes state | Abort controllers plus generation/cleanup checks; ignored-abort fetches tested too |
| R-110 | Failed refresh reports success; inactive list can overwrite active state; delayed topics allow a stale toast/spinner after a tab change | Refresh only active list, check its actual outcome and generation; scope-specific spinner |
| R-111 | Non-list/primitive rows reach sort/render, sparse repositories lack contributors, developers lack popularRepo, null date becomes 1970 | Reject malformed main lists; normalize renderable row fields/arrays/numbers; filter invalid topics; validate timestamp type |
| R-112 | Global 30-day/all-language topics bypass main list's filters | Owner-approved separate labeled section |
| R-113 | Same-account metadata update retriggers conversation snapshot loading and replaces newer local messages | Callback keys on user ID; no missing-user I/O; direct selection wrapper is the sole snapshot owner |
| R-114 | Old selection, clear/delete overlap or duplicate loads restore/clear a newer local selection | Request generations; clear/delete/new-chat invalidate pending loads; delete uses functional current-state setters; successful clear empties visible messages |
| R-115 | Saved key catalog preflight omitted actual api_limits/api_logs in table metadata sections | Explicitly include all three playground tables in columns/grants/RLS/constraints/triggers; coverage/read-only guard |

Tests failed against the original defects, including the follow-up delayed-delete
case. Chat findings establish local state/history replacement, not deletion or
restoration of persisted rows. R-011's database concurrency issue remains separate.
The key query is an unexecuted read-only preflight, not a migration. Connector
again refused a columns-only query; no key values or SQL mutations were accessed.

## Final local validation

- Node contract/guard suite: **1449/1449 passed**.
- Targeted new browser-boundary tests: **21/21 passed** before the final standalone key guard; key guard **1/1 passed**. They exercise actual hooks/helpers and page selection wrapper with controlled scheduling; they are not React rendering tests.
- Strict lint: exit 0 under `eslint --max-warnings 0`. Existing baseline-browser-mapping age notice remains; Node may also warn about typeless ESM test imports.
- Go topics/trending fixtures pass; actual-server topics public/cache wiring and security-header drift checks pass. Full backend/lesson verification runs in the normal completed handoff.
- Final isolated production build and forwarding: **152/152 comparisons**, plus **69 stateful AI requests across six groups**, pass after the last chat production edit.
- `node scripts/trending-browser-probe.mjs --production`: production React in headless Chrome, **seven groups at 1280px and seven at 390px** pass. Covers separate labeled scope, malformed/sparse rows and date, ignored-abort old response, honest failed refresh, scope changes while topics wait, active-tab-only refresh, no horizontal overflow or uncaught exceptions. Browser API fixtures only; external HTTPS blocked. Added to hosted workflow after the production build/probe.
- Probe syntax and diff/reference checks pass. Existing owner exercises unchanged; no new Go lesson required because no Go implementation changed. Lesson 33's integration note updated.

Mill's initial BUG-010 review independently passed five existing guards, strict
lint on 15 changed source files, actual Go CSP drift test, real SDK HEAD-count
callback (7/42/99), and installed Next image helper checks. Follow-ups reproduced
additional races; final independent chat selection suite **6/6 passed**, and the
reviewer accepted the final UI fix scope with no unresolved findings. Parent
build/browser/full-suite results remain attributed to Codex, not the reviewer.

## Remaining gates

No preview or production switch changed. CDN cache/rollback, current schema/RLS,
real two-user isolation, Realtime and signed-in chat browser behavior remain
preview/live gates in [the cutover runbook](../cutover.md). R-054 and other owner
choices stay open. KEYS-001 requires catalog access before executable schema work;
its real hashed/show-once/server-accounting direction is already decided.
Phase 6 and the whole migration are not complete, so Phase 7 retirement stays gated.
