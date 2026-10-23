# HANDOFF-002 / BUG-023: verification and synchronization

R142 recorded shared-checkout synchronization overlapping a handoff compiler.
The watcher reported `READY_NEEDS_VERIFY` while a verifier was running. An
isolated process test reproduced that status. A second reproduction changed
source during a blocked contract check; the old implementation emitted success
for the new end-of-run fingerprint. That false-proof defect is R183.

## Cooperation protocol

Normal handoff acquires `.agent-verification.lock` exclusively before invalidating
old proof or starting checks. It contains only public process/nonce/start
metadata. Any lease, including interrupted/unreadable state, blocks competitors:

1. `--status` returns `VERIFICATION_BUSY`, `canSynchronize:false`, and no matching
   proof. The Git Agent waits and leaves the checkout unchanged.
2. A competing handoff refuses before deleting earlier proof or launching
   checks. `--stamp-sync` refuses before changing coordination. Stamping also
   requires writer release and a completed latest task.
3. Source fingerprints before/after checks must match before success is emitted.
   Lease/signal files are excluded. Normal/failure cleanup removes only the
   lease matching the current process and original nonce; foreign state stays.

Status completes slow Git/optional CI reads before its final lease sample and
constructs the output without further async/Git work. A lease acquired while
status was running overrides readiness (R184). Git status/reference/fingerprint
failures return nonzero `STATUS_ERROR`, `canSynchronize:false` and unknown
cleanliness rather than treating empty stdout as a clean checkout (R185).

Status is read-only. Check status immediately before synchronization, obey
one-writer ownership, and verify actual commit/remote refs afterward. A stamp
before commit remains synchronization intent, not proof of commit or push.

This is an advisory protocol, not an OS/VCS lock. Direct Git/file commands can
bypass it. Fingerprints catch lasting changes, not arbitrary transient edits
restored before comparison. Simultaneous implementation still needs worktrees.

## Interrupted or unknown lease

Read presence/state/public PID/start metadata through `--status`. Confirm the
recorded owner **and its child checks** have stopped; a missing parent PID or
old timestamp alone is insufficient. PIDs can be reused. If uncertain, keep
synchronization blocked. Inspect the current Git diff and durable checkpoint.

Only after those checks may the agent verify the exact repository/root lease
path, remove that single stale local file, and run fresh normal verification.
No recursive deletion, blanket cleanup or automatic stale reset is implemented.
An old success signal is insufficient after interruption.

## Evidence

Writer Codex, base main87ba11b. Both initial reproductions failed before the
fix. First focused verification passed17tests across concurrency, failure-output,
optional-lesson and fingerprint/stamp suites. Explicit-lesson cases use synthetic
commands; no actual tutorial exercise/solution was run.

Tests use temporary Git repositories and fake check processes. They verify busy
watcher/stamp/competitor behavior, preserved proof on refused competing runs,
normal/failure cleanup, changed-source rejection, unknown-lease refusal and
process/nonce ownership. They do not synchronize remote Git. Final independent
review and full checks belong to the completed coordination handoff.
