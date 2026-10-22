# KEYS-RECOVERY-002 / KEYS-ACCEPT-001 verification

Base main `a60e3b9`, writer Codex, reviewer Arendt read-only. Owner-approved dev
test policy was applied and readback verified; no hosted lifecycle, identity or
signer change was executed. Commit and final check results
are in the current coordination handoff.

`OpenRecovery` uses one bounded/validated pending read to establish the supplied
gateway capability independently of enabled admissions. A separate concrete
Go wrapper exposes only Pending/Complete and redacts formatting/serialization.
It cannot be widened into reservation/management via a type assertion. The
underlying JWT still has its existing role grants; it is not newly provisioned.

Focused tests cover disabled-policy opening/completion, absence of unrelated
RPCs/capabilities, invalid credentials, denied/malformed pending replies,
redaction and cancellation before/during I/O. Five groups plus malformed-page
subcases pass after fixture correction. A new cancellation fixture initially
hung in server teardown for10minutes despite the client returning; an owned
release channel fixed teardown, then the focused25s-timeout run passed.

Twenty-one synthetic hosted-runner regressions pass: target/write/credential
refusal before network, verified distinct owners, full role/private-schema
matrix, strict/canonical/no-secret replies, concurrent key/two-key-owner quotas,
completed-attempt charging, saved-pending conflict, completion/replay/revocation,
lost issuance without retry, confirmed scoped cleanup, independent owner/key
cleanup after failure, drained parallel requests and safe run nonce/reports.
Three one-microsecond pending/saved timestamp changes failed their regressions
before correction; exact fractional comparison now rejects them while accepting
equivalent offset/extra-zero spellings.
These are orchestration tests, not a hosted role/RLS acceptance result.

Arendt reproduced two draft blockers (cleanup skipping other keys and accepting
non-void replies). Parent added three failing regressions, corrected them and
expanded previously overstated coverage. Earlier noncanonical acceptance also
failed its regression before correction. R172-R175 record the unshipped tooling
and fixture corrections; R176 adds the timestamp precision correction. Arendt
accepted the final source in REVIEW-023, independently passing21runner tests,
28additional actual-helper checks and the prior five-group Go suite. Reviewer
did not run Docker/live calls/lessons; those boundaries remain explicit.

The existing Docker-labelled native PostgreSQL runner additionally tests the
review-only policy: application-bearing/dirty-data/repeated installation guards,
exact runner-policy agreement and restoration of synthetic legacy state. Its
first attempt failed before container creation because Docker was stopped;
Docker Desktop was started hidden; retry passed128nativechecks and the wrapper
removed its owned container. This is disposable PostgreSQL17.6 evidence, not
a policy installation or hosted17.11 authorization result.

Lessons42/44 and index are updated as source only. Existing exercises are
untouched; no actual lesson tests/vet/build ran. Full1533contract tests and strict
lint pass after the precision correction; full uncached backend tests/vet/format
passed before that JS-only correction. No UI changed, so no new local browser/build
proof is claimed. Hosted CI still runs the established browser/forwarding gates.

The [acceptance runbook](../database/keys-hosted-acceptance.md) identifies the
approved/applied test policy and missing supplied credentials. The
[hosted policy receipt](../database/keys-staging-policy-2026-10-22.json) contains
immediate target/hash/zero-state preflight and exact administrative readback.
No user/accountant JWT gateway result is inferred from that SQL read. The
approved provider-free run remains pending separately approved credentials.
Neither local tests nor source review authorizes identity creation, signing
changes, runtime activation, legacy revocation or deployment.
