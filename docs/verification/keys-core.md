# KEYS-CORE-001 / BUG-014 evidence

2026-10-20, Codex on Windows. Base045db3c. The owner requested larger batches;
this batch combines legacy characterization, an immediate privacy correction,
an unwired Go lifecycle core, tests and lesson40. It does not port/activate the
last original key route or satisfy production database/HTTP/browser gates.

## Existing route

The actual Next handler and real supabase-js run against local synthetic Auth,
Data API and deterministic entropy. Archived legacy-v1 has29 cases, including
free-form synthetic credential details reaching the failure log. Current v2
sets no-store on every response and logs only a fixed event. Two red tests
reproduced both gaps before the source correction; current32 tests pass.

Explicit comparison of all29 v1/v2 expectations shows identical response
body/status, entropy calls and SDK database requests; only cache control and
error capture differ. No production schema or browser data path changed. The
shared route runner's log capture is opt-in; absent flags retain previous
output shapes across other contracts.

Actual isolated production Next build/probe passed: anonymous key POST gives
401/no-store while remaining in Next,152/152 direct/forwarded comparisons, and
69 stateful AI requests across six groups. Placeholder Supabase settings and
fixture GitHub/Auth/AI upstreams only. No live user/session/database write or
provider request. There was no browser UI change in this batch.

## Go core

Only standard library, no HTTP registration, production storage implementation,
new runtime switch or credential. `Management` and `Accounting` remain distinct
capabilities; a test-only shared store models transactions/clock/quotas/events.
Eleven proposed serial fixture scenarios plus native tests cover:

- Random material/strict canonical encoding, stored digest not accepted as a
  bearer, private verifier restoration and sanitized entropy errors.
- Metadata-only listing, anonymous/cross-owner management, one-time reveal and
  formatting/JSON redaction, including value copies and concurrent callers.
- Explicit policy, immutable endpoint configuration, name/scope validation,
  active-key caps across instances, collision caps and ambiguous-create failure.
- Scope/revocation/expiry rechecks at atomic reservation, including mutations
  between lookup/reserve, storage-authoritative time and exact expiry/window.
- Concurrent per-key and per-owner quota, unrelated-owner independence, no
  partial owner charge after key denial, attempts committed before upstream.
- Repeated/rebound request IDs, unknown/foreign/conflicting completion, identical
  completion retry, ambiguous reservation and pending-attempt behavior.
- Upstream errors/status, cancellation before/after reservation/during work,
  bounded uncancelled completion, callback panic and failed accounting recovery.

Policy values and attempt charging are explicit synthetic/implementation
proposals, not approved rollout settings. Memory conformance does not establish
RLS, distributed quota enforcement or real database transaction correctness.
No raw key, hash, JWT, query, prompt or provider payload belongs in usage records.

## Independent findings and corrections

Sartre read-only review found:

1. Secret value copy duplicated embedded raw state and bypassed pointer-only
   redaction (R132). Actual red test reproduced a second reveal, disclosure with
   five formatting verbs and direct JSON acceptance. Fixed shared private reveal
   state and value-receiver formatting/JSON; targeted tests/vet pass.
2. Callback panic plus completion error unwound past the recovery return (R133).
   Actual red test reproduced it. Callback execution/return tracking now converts
   panic to fixed failure/status500 before completion, preserving typed exact
   recovery. Tests cover nil-panic compatibility modes0/1. Process/goroutine death
   and broken/panicking storage still require durable pending reconciliation.
3. Lesson40 row was separated from its Markdown table (R134). Fixed contiguous
   table; new guard checks one table and every lesson linked exactly once.

R131 storage-clock self-review correction is covered by expiry/scope/revocation
race and window-boundary tests. R127-R129 legacy defects remain open/pinned.
R039 remains open until full lifecycle/supported endpoint is live.

Parent ordinary-build verification also found the exercise's types existed only
in its test file (R135). Shared scaffolding now lives in regular `state.go`, so
ordinary and solution builds work without completing the owner's exercise.
Two additional test-only conformance cases cover committed-before-response
completion failure and actual completion-deadline exhaustion after parent
cancellation; exact receipt retries do not repeat work or accounting.

## Validation status

Codex's corrected full backend35 packages pass with
`go test -p 2 -count=1 ./...`; backend vet/build pass and gofmt is empty.
Node1485/1485 contracts and strict lint pass. Existing browser-mapping age and
typeless-ESM notices do not produce ESLint warnings/errors. All41 lesson solution
packages and both exercise/solution vets passed; final lesson40 scaffold checks
also pass for ordinary/solution builds, both vets and solution tests. The three
ordinary lesson40 exercise tests intentionally fail until the owner completes
the exercise; this is not an application regression. Extra test-only completion
cases pass focused tests/vet after the full backend run.

Sartre's actual independent regression acceptance and targeted checks are
attributed in REVIEW-014. The normal completed `npm run handoff` repeats all Node
contracts, fresh backend tests/vet/format and all lesson solutions after the
final files; its signal, resulting commit, remote synchronization and hosted CI
are separate receipts, not established by writing this report.

Production build/probe remains applicable after the corrective Go-only work:
`internal/apikey` is not imported by cmd/api and frontend/legacy handler/probe
source did not change after that passing run. No fresh production browser or
live auth/RLS/CDN check is claimed. Local race detector is unavailable; hosted
Linux race/production/Chrome workflow must verify the eventual commit.

Owner offered catalog restoration. Columns-only query still returned MCP-32600;
list_projects worked but did not include the expected SEFGH project. No other
project queried or SQL mutated. Once access changes, obtain actual definitions,
prepare reviewed migration/denial/rollback checks, then implement real adapters,
recovery/retention, supported public endpoint and show-once browser flow.
