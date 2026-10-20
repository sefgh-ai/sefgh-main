# Browser data migration review: DATA-REVIEW-001 / BUG-011

Date: 2026-10-20 (Asia/Calcutta). Base: `189604f`, main.
Owner: Codex; independent reviewer of Codex safety fixes: James (read-only Codex agent).
Status: local implementation, review and verification complete; no cutover or deployment.
Commit state at handoff: uncommitted; Git Agent receipt must be checked separately.

## Reviewed migration scope

- DATA-001b: search-history domain, caller identity/filtering, unchanged version-1 contract (35 cases), browser switching and fallback.
- DATA-002: onboarding domain, caller ownership and writable fields, unchanged version-1 contract (34 cases), library result/error compatibility.
- DATA-PROXY-001: area/table/method/write-field policy, browser routing, user token/public key forwarding, reply/count headers and local safety bounds. The Data API verifies the token and enforces RLS; this proxy does not replace database authorization.

## Findings and executable evidence

| Entry | Before the fix | Final behavior and regression |
|---|---|---|
| R-106 | 301/302/303/307/308 reached a second local destination; redirects could carry caller credentials or replay a write | Copy the client and refuse redirects. Destination receives no request; local error has Data API shape and status 502. Tests include production newHandler wiring |
| R-107 | Non-public/combined profile headers reached the Data API. Initial fix also left a configurable schema default when headers were omitted; reviewer caught this | Reject every supplied non-public or conflicting value. Explicitly set outgoing Accept-Profile public for GET/HEAD and Content-Profile public for writes; five-method headerless regression |
| R-108 | Unfinished JSON timed out for history and onboarding; proxy control already passed | Shared 24-second context and connection read deadline start before User, remain during server drain and bound later calls. Real TCP tests plus no-sleep identity/database inheritance tests |

New tests failed against the defects before fixes. Existing JSON fixtures were not changed. The reviewer independently ran focused schema, redirect, request-budget, stalled-body, write-timeout and inheritance checks. His schema-default finding and ordering coverage comment were addressed and reviewed again. Final verdict: acceptable with switches off; no remaining finding in the production safety-fix scope.

## Final local checks (Codex, Windows)

| Check | Result |
|---|---|
| npm run test:contracts | 1431/1431 pass |
| backend go test -count=1 ./... | 32 packages pass |
| backend go vet ./...; gofmt -l . | clean; no unformatted files |
| learn-go go test -count=1 -tags solution ./... | 39 packages pass |
| learn-go go vet ./... and go vet -tags solution ./...; gofmt -l . | clean; no unformatted files |
| Lesson 38 without solution tag | intentionally fails unfinished exercise tests; not a regression |
| npm run lint (eslint --max-warnings 0) | exit 0; no ESLint errors/warnings. Tool emits the pre-existing baseline-browser-mapping data-age notice |
| Final Go build; isolated production Next.js build/probe --production --phase2 | pass: 152/152 direct/forwarded comparisons, including three new schema cases; 69 stateful AI requests across six groups pass |
| node --check forwarding probe; git diff --check | pass; Git may print line-ending notices |

The first production run also passed, but it preceded the final schema pin and is superseded by the final rerun. Temporary logs use the prefix `sefgh-data-review-` in the Windows TEMP directory. Their survival is not a requirement for this report. All upstream/Auth/provider calls were local stand-ins; no live rows, credentials or provider billing used.

## Remaining gates and next work

No switch changed. Before enabling a browser area, follow [the cutover runbook](../cutover.md): approved preview, two real user accounts, current schema/RLS/trigger/function evidence for affected writes and Realtime parity. Proxy forwarding is not proof of atomic conversation edits (R-011) or the key lifecycle. R-102 is deliberately preserved until search-history cutover. R-103 remains a database-policy concern even though the Go proxy refuses stats updates.

KEYS-001 still needs catalog evidence and reviewed SQL under the owner's already chosen real hashed/show-once key direction. R-090 remains scheduled for a Go fix after share cutover. BUG-010 and TREND-001 reviews are separate work; this report does not claim them. Phase 3 and the overall migration are not complete. Phase 7 stays gated.

The normal npm run handoff verifies suites again and signals the Git Agent only after the completed handoff and writer release are saved. Check actual commit/remote receipts rather than assuming the signal is a commit or deployment.
