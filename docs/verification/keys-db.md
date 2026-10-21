# KEYS-DB-001 verification

Post-commit update (KEYS-DB-002 / BUG-015): original36files committed732d0dc
and synchronized on both remotes; main also timestamp-onlyd538936. Normal
handoff98161 passed contracts/backend/lessons and emitted its signal. Hosted
39563561717 exposed two verification-harness gaps: native job observed the
Docker temporary unix-only server, and Linux race detected the ambiguous
connection test's plain counter. R153/R154 corrections gate final hosted
acceptance; the original run failed, and is not reported as a green release.

Both launchers and central runner now require final TCP127.0.0.1 readiness
before any bootstrap SQL, without retrying partially committed setup. The
pinned image's own entrypoint confirms its temporary server has empty
listen_addresses. Wrapper and direct immediate cold-start runs each passed120
native assertions, with owned containers removed. The HTTP test now uses atomic
Add/Load for calls/redirects;10focused repeats and vet pass. Lesson43 explains
goroutines/atomics and preserves existing owner exercises. Its solution tests,
ordinary/solution build and both vets pass. Runtime SQL/Go implementation hashes
from REVIEW-016 are unchanged. Replacement hosted results belong to the newest
coordination handoff, not to these local results.

Implementation and independent review complete for the unregistered local
SQL/RPC foundation. Live SQL, runtime enablement and deployment are separate.
Base/current at verification: main660a508ca85cea5c09c9ff440c622848c0ff5745,
uncommitted. Final handoff records Git Agent receipts separately.

## Writer checks (Codex, Windows, 2026-10-21)

- Native PostgreSQL17.6: **120 assertions pass** using the actual migration in
  a synthetic, labelled, network-isolated Docker fixture. Official image pinned
  to sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929.
- Twelve independent psql processes race two keys for one owner: exactly four
  admissions, with consistent owner/key counters and pending events. Ten
  concurrent issuances enforce the four-active-key fixture cap.
- All six private tables deny direct privileges to four caller roles; all nine
  wrapper grants match user3/accountant6/anon0/service0. Helpers cannot bypass
  ownership, anonymous denial or scope validation; accountant cannot assume
  user/service/read-all roles, read legacy user data or reach an unrelated
  privileged fixture mutator.
- Missing/disabled policy, stale revision, replay, foreign/idempotent revocation,
  expiry while waiting on owner lock, policy share-lock stability, full-token
  hash compatibility, metadata-only listing and finite receipt state pass.
- Completion/recovery exact retries, conflicting pending and completed results,
  equivalent timestamp spellings, lost receipts, and later receipt discovery
  beyond100 pending records pass. Owner history traverses109metadata rows
  without duplicate/omitted ids using bounded keyset pages.
- Injected failure immediately before COMMIT leaves no role/schema/wrappers and
  preserves the legacy sentinel. Preexisting overload abort preserves its ACL;
  reapplication refuses collision. A local schema drop inside ROLLBACK retains
  new state. Separate legacy TRUNCATE-hardening proposal removes excess
  privilege without changing CRUD grants or rows. Catalog verification SQL
  executes read-only against the fixture. No production rollback claim.
- Go RPC suites pass: verified-user bearer/owner binding, separate accounting
  policy and credentials, accounting-only executor, strict reply shapes,
  anonymous/key-as-session denial, no redirect/retry/error-payload leakage,
  credential formatting/JSON refusal, project-key config guard, mixed timestamp
  instants,105row pages and repeated-cursor denial. Actual SQL is tested by the
  separate native runner; HTTP stand-ins do not establish hosted gateway parity.
- Initial full backend35packages test/vet/build and empty gofmt passed; after
  review corrections the final broad run is recorded in coordination.md.
- All43lesson ordinary/solution builds, solution tests, both vets and empty
  gofmt passed. Existing exercises untouched; lesson42 exercise intentionally
  unfinished. Solution and ordinary builds are distinct checks.
- Node contracts1485/1485 passed. Final strict lint and handoff results are in
  coordination.md. No Next UI/runtime/forwarding source changed in this batch.

## Independent review (Hume, read-only)

First source review required recovery corrections. Parent reproduced mixed-zone
Go pending rejection and conflicting SQL completion RED, corrected them, and
added paging, finite-state and privilege/config regressions. Earlier native
NULL-state and string-status defects were also reproduced before correction.

Final verdict: accepted for the unregistered local foundation, no unresolved
blocking source findings. Hume independently passed full apikey tests/vet,
target formatting/diff, lesson42 solution tests, ordinary/solution builds and
both vets. Hume reviewed native SQL/assertions and workflow but did not rerun
the database tests or make live calls. These are not writer-run SQL results.

## Resolved test/tool issues

Role escalation initially tested superuser SET ROLE rather than session
authorization; corrected the harness. Lock polling initially blocked Node child
stdin flush; yielding the event loop made native lock-wait checks observe the
wait. Windows Docker template quoting refused cleanup until JSON label parsing
was used. One intermediate transport extraction had a stale struct body,
corrected before tests. Several documentation patches failed anchor verification
atomically and were reapplied; no partial document mutations were inferred.
All owned ephemeral containers are removed in wrapper finally cleanup.

## Not run / remaining gates

Only catalog SELECTs against the expected hosted project, no key/user/usage
values, DDL/DML, account credentials or provider calls. No live SQL application,
real gateway/role JWT/two-user denial tests, accountant provisioning/rotation,
policy approval, existing-key transition, recovery worker/retention, UI,
runtime/forwarding activation, preview or production rollback. Local race is
unavailable without a C compiler; hosted CI runs Linux race and the new native
SQL job after commit. No production build/browser run was needed for unchanged
UI/wiring; normal hosted verification still repeats those existing gates.

Review [concrete SQL and rollout](../database/keys-001-review.md) before apply.
R039 remains open, and exact original route count stays23/25. Worker execution
remains owner-gated pending active deployment/corpus evidence.
