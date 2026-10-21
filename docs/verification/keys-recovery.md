# KEYS-RECOVERY-001 / LESSON-POLICY-001

Scope: an unregistered bounded receipt-recovery helper, optional tutorial
verification, and the isolated staging/review record. Base `6dadafc`, branch
`main`. Commit and final handoff results are recorded in `coordination.md`.

## Recovery evidence

`backend/internal/apikey/recovery.go` adds a `Pending`/`Complete` interface and
one-page `RecoverCompletionPage` function. It has no scheduler, CLI command,
HTTP registration, quota reservation, provider operation or new dependency.
Each call requires1..100rows and a positive budget of at most30seconds.

The initial stub failed the seven recovery test groups and malformed-page
subcases. Implemented focused tests pass, including:

- Saved receipts pass unchanged to completion; missing ones remain pending.
- One hundred unknown rows do not block a later known receipt. A fresh scan
  revisits a receipt that arrives for an earlier unknown attempt.
- A limit or failure preserves confirmed counts and a cursor before the failed
  or unprocessed row. Ambiguous completion retries use exactly the same receipt.
- Input, full-page ordering/binding/cursor/shape validation happens before writes.
  Equivalent timezone offsets compare by timestamp instant.
- Caller cancellation, reader budget, cursor copying and fixed adapter errors.
- An actual loopback HTTP fixture observes only accountant pending/complete
  RPCs. A first500reply stops; a later invocation submits the same receipt.

Two final edge cases additionally check a malformed row beyond `MaxRows:1`
and expiry while completion is blocked. Final checks/review of that delta are
reported in the handoff; initial independent review preceded those two cases.
These are synthetic adapter/core tests, not hosted gateway authorization or
new native SQL evidence. Existing exact-receipt SQL idempotency coverage is in
[KEYS-DB-001](keys-db.md). `More:false` means the scan ended, not that every
outcome is known. Operational scheduling, retention, unknown-outcome handling
and recovery startup while admissions are disabled remain gates.

## Tutorial policy and R170

The owner requested generated lessons without repeated lesson checks. Default
handoff retains production contracts, backend tests/vet/format and writer/state
checks. It records `learnGoPassed:null`, `learnGoSkipped:true` and
`learnGoCheck:skipped-owner-policy`. `--lessons` explicitly opts in; manual CI
has a typed `verify_lessons` option. An explicit failure remains fatal.

Hume reproduced an existing stale-proof path while reviewing this change:
successful handoff, later failed explicit verification, then status still
READY_VERIFIED. The new isolated real-CLI sequence failed before correction.
Normal verification now removes the earlier signal before checking anything;
status and stamp modes exit before this mutation. All five focused CLI cases
pass with fake npm/Go commands. They do not execute tutorial code. R170 is
fixed locally; R142's shared-checkout overlap is a separate open issue.

The repository's status consumer accepts the exact skip representation. The
external Git Agent implementation was not available for source review; actual
commit/synchronization evidence must be recorded separately rather than
assuming compatibility or setting a skipped check to true.

Lesson44 and its unfinished exercise/test/reference were generated and source
reviewed. No actual lesson tests, vet or build ran for this batch. Existing
exercise files were not edited. Production backend verification remains required.

## Staging and live boundaries

[Staging record](../database/keys-staging.md) identifies the newly created
isolated project, cost/organization approval, read-only prerequisite checks and
the exact SQL review bundle. After a separate explicit owner approval, the
additive migration applied in development only; all six catalog queries and
23function-body comparisons pass. No policy seed, role credential, test identity
or runtime setting was created. Hosted credential/gateway acceptance is next. Rotation to v1 is chosen; old-key revocation waits for
approved cutover. Workers remain gated. R039 stays open and route count23/25.

Final strict lint, production backend suites/vet/format, Node contracts,
independent review, handoff and Git/CI receipts belong in the current
coordination record. No local race result is claimed without a C compiler;
hosted CI remains responsible for that check.
